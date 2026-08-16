import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createCheckout } from "@/lib/lemon-squeezy";

export const isLsConfigured = createServerFn({ method: "GET" }).handler(async () => {
  const hasApiKey = !!process.env.LEMONSQUEEZY_API_KEY;
  const hasCreatorVariant = !!process.env.LEMONSQUEEZY_VARIANT_CREATOR;
  const hasProVariant = !!process.env.LEMONSQUEEZY_VARIANT_PRO;
  const hasStoreId = !!process.env.LEMONSQUEEZY_STORE_ID;
  return hasApiKey && hasCreatorVariant && hasProVariant && hasStoreId;
});

export const createLsCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: { tier: string; referrer?: string }) => d)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("@/lib/auth/server-auth");
    const user = await requireAuth();
    const { tier, referrer } = data;
    if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) return null;
    const variantMap: Record<string, string> = {
      creator: process.env.LEMONSQUEEZY_VARIANT_CREATOR || "",
      pro: process.env.LEMONSQUEEZY_VARIANT_PRO || "",
    };
    const variantId = variantMap[tier];
    if (!variantId) return null;
    const redirectUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/payment/success?tier=${tier}`
      : `/payment/success?tier=${tier}`;
    const checkout = await createCheckout({
      variantId,
      email: user.email,
      name: user.name || user.email.split("@")[0],
      redirectUrl,
      referrer,
    }).catch(() => null);
    return checkout?.url || null;
  });

export const Route = createFileRoute("/api/lemon/checkout")({
  component: () => null,
  loader: async () => {
    throw redirect({ href: "https://viraleo.pro" });
  },
});
