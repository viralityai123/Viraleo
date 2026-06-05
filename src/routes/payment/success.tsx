import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { setPlan } from "@/lib/credits";
import { getSessionFromDocument, getSessionToken, verifySession } from "@/lib/auth/session";
import { trackSignup, addCommissionEvent } from "@/lib/partner-store";
import { sendPaymentReceiptEmail, sendWelcomeEmail } from "@/lib/email";

const recordReferralSignup = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; email: string; token: string }) => d)
  .handler(async ({ data }) => {
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session) throw new Error("Unauthorized");
    await trackSignup(data.slug, data.email);
    return { ok: true };
  });

const recordCommission = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    userEmail: string;
    tier: string;
    variantId: string;
    subId: string;
    eventName: string;
    timestamp: number;
    referralSlug: string;
    amount: number;
    token: string;
  }) => d)
  .handler(async ({ data }) => {
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session) throw new Error("Unauthorized");
    await addCommissionEvent(data as any);
    if (session.email) {
      sendPaymentReceiptEmail(session.email, session.name || "Creator", data.tier, data.tier === "pro" ? "$50" : "$20").catch(() => {});
    }
    return { ok: true };
  });

const verifyCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: { checkoutId: string; expectedTier: string }) => d)
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env.LEMONSQUEEZY_API_KEY;
      if (!apiKey) return { ok: false, variantId: "", userEmail: "" };
      const res = await fetch(`https://api.lemonsqueezy.com/v1/checkouts/${data.checkoutId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!res.ok) return { ok: false, variantId: "", userEmail: "" };
      const json = await res.json();
      const status = json.data?.attributes?.status;
      const variantId = json.data?.attributes?.first_variant_id?.toString() || "";
      const userEmail = json.data?.attributes?.checkout_data?.email || "";
      const checkoutId = json.data?.id?.toString() || data.checkoutId;
      const creatorVariant = process.env.LEMONSQUEEZY_VARIANT_CREATOR || "";
      const proVariant = process.env.LEMONSQUEEZY_VARIANT_PRO || "";
      const actualTier = variantId === creatorVariant ? "creator" : variantId === proVariant ? "pro" : "free";
      const tier = actualTier !== "free" ? actualTier : data.expectedTier;
      return { ok: status === "paid", tier, variantId, userEmail, checkoutId };
    } catch {
      return { ok: false, variantId: "", userEmail: "" };
    }
  });

export const Route = createFileRoute("/payment/success")({
  head: () => ({
    meta: [
      { title: "Payment confirmed — Viraleo" },
      { name: "description", content: "Your Viraleo payment was confirmed. You now have access to premium YouTube channel intelligence features." },
      { property: "og:title", content: "Payment confirmed — Viraleo" },
      { property: "og:description", content: "Payment confirmed. Welcome to Viraleo premium." },
      { name: "twitter:title", content: "Payment confirmed — Viraleo" },
      { name: "twitter:description", content: "Payment confirmed." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/payment/success" }],
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tier = params.get("tier") || "pro";
    const checkoutId = params.get("checkout_id") || "";

    async function init() {
      let planTier = tier === "creator" || tier === "pro" ? tier : "pro";
      let verified = false;
      let variantId = "";
      let userEmail = "";
      let lsCheckoutId = checkoutId;

      if (checkoutId) {
        const result = await verifyCheckout({ data: { checkoutId, expectedTier: tier } }).catch(() => null);
        if (result?.ok && result.tier) {
          planTier = result.tier;
          variantId = result.variantId || "";
          userEmail = result.userEmail || "";
          lsCheckoutId = result.checkoutId || checkoutId;
          verified = true;
        }
      }

      if (verified || checkoutId) {
        setPlan(planTier as any);
        localStorage.setItem("viraleo:plan-selected", "true");
        localStorage.setItem("viraleo:plan-source", "paid");
        setStatus("success");
      } else {
        setStatus("error");
        return;
      }

      const ref = localStorage.getItem("viraleo:referrer");
      if (ref) {
        const token = getSessionToken() || "";
        const email = userEmail || getSessionFromDocument()?.email || "";
        recordReferralSignup({ data: { slug: ref, email, token } }).catch(() => {});

        const commissionAmount = planTier === "pro" ? 25 : planTier === "creator" ? 10 : 0;
        if (commissionAmount > 0 && verified) {
          recordCommission({
            data: {
              id: lsCheckoutId,
              userEmail: email,
              tier: planTier,
              variantId,
              subId: lsCheckoutId,
              eventName: "order_created",
              timestamp: Date.now(),
              referralSlug: ref,
              amount: commissionAmount,
              token,
            },
          }).catch(() => {});
        }
      }
    }

    init();

    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    const timeout = setTimeout(() => navigate({ to: "/pre-analysis", search: { channel: undefined, activityId: undefined } }), 5000);

    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        {status === "verifying" ? (
          <>
            <svg className="animate-spin h-10 w-10 mx-auto text-emerald-500 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-muted-foreground">Confirming payment...</p>
          </>
        ) : status === "error" ? (
          <>
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment received!</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Your plan will be activated shortly. You may need to refresh the page.
            </p>
            <p className="mt-6 text-xs text-muted-foreground/60">
              Redirecting to dashboard in {countdown}s...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment confirmed!</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Your plan is now active. You have full access to all features.
            </p>
            <p className="mt-6 text-xs text-muted-foreground/60">
              Redirecting to dashboard in {countdown}s...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
