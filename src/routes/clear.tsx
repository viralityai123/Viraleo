import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/clear")({
  component: ClearPage,
});

function ClearPage() {
  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    const viraleoKeys = allKeys.filter(
      (k) =>
        k.startsWith("viraleo") ||
        k.startsWith("VITALEO") ||
        k.includes("plan") ||
        k.includes("credit"),
    );
    viraleoKeys.forEach((k) => localStorage.removeItem(k));
    document.cookie = "viraleo_session=; Path=/; Max-Age=0; SameSite=None; Secure";
    document.cookie = "viraleo_ref=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Local data cleared!</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Full page reload incoming...
        </p>
      </div>
    </div>
  );
}
