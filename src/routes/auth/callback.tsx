import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { signSession, serializeSessionCookie, clearSessionCookie, SESSION_COOKIE } from "@/lib/auth/session";
import { sendWelcomeEmail } from "@/lib/email";

const sendWelcome = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; name: string }) => d)
  .handler(async ({ data }) => {
    await sendWelcomeEmail(data.email, data.name);
    return { ok: true };
  });

const exchangeGoogleCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; redirectUri: string }) => d)
  .handler(async ({ data }) => {
    const { code, redirectUri } = data;

    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const jwtSecret = process.env.JWT_SECRET || "";
    if (!clientId || !clientSecret || !jwtSecret) {
      return { ok: false, error: "Server misconfigured" } as const;
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) {
        return { ok: false, error: "Failed to exchange code" } as const;
      }
      const tokens = await tokenRes.json() as { access_token: string; id_token?: string };

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!userRes.ok) {
        return { ok: false, error: "Failed to fetch user info" } as const;
      }
      const user = await userRes.json() as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      const token = await signSession(
        { sub: user.id, email: user.email, name: user.name, picture: user.picture },
        jwtSecret,
      );

      return { ok: true, token, user: { id: user.id, email: user.email, name: user.name, picture: user.picture } } as const;
    } catch {
      return { ok: false, error: "Server error during authentication" } as const;
    }
  });

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing in — Viraleo" },
      { name: "description", content: "Completing your sign-in to Viraleo." },
      { property: "og:title", content: "Signing in — Viraleo" },
      { name: "twitter:title", content: "Signing in — Viraleo" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/auth/callback" }],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");
    const state = params.get("state");

    if (errorParam || !code) {
      setStatus("error");
      setError(errorParam || "No authorization code received");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    exchangeGoogleCode({ data: { code, redirectUri } }).then((result) => {
      if (!result.ok) {
        setStatus("error");
        setError(result.error || "Authentication failed");
        return;
      }

      document.cookie = serializeSessionCookie(result.token);
      sendWelcome({ data: { email: result.user.email, name: result.user.name } }).catch(() => {});
      if (state === "partner") {
        localStorage.setItem("viraleo:partner", "true");
        window.location.href = "/partner/dashboard";
      } else {
        window.location.href = "/select-plan";
      }
    }).catch(() => {
      setStatus("error");
      setError("Network error during authentication");
    });
  }, []);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign in failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 mx-auto text-emerald-500 mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
