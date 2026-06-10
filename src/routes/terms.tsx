import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/landing-v2/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Viraleo" },
      {
        name: "description",
        content:
          "Viraleo Terms of Service. Read the terms governing your use of our YouTube channel intelligence platform.",
      },
      { property: "og:title", content: "Terms of Service — Viraleo" },
      { property: "og:description", content: "Viraleo Terms of Service." },
      { name: "twitter:title", content: "Terms of Service — Viraleo" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalLayout>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-sm text-[#5b5b66] mb-10">Last updated: May 27, 2026</p>

      <div className="space-y-8 text-[15px] leading-relaxed text-[#5b5b66]">
        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">1. Acceptance</h2>
          <p>
            By using Viraleo, you agree to these terms. If you do not agree, do not use the service.
            We may update these terms; continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">2. Service</h2>
          <p>
            Viraleo provides AI-powered analysis of public YouTube data. Reports are for
            informational purposes only and do not guarantee video performance or viral results.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">3. Account</h2>
          <p>
            You are responsible for maintaining your account credentials. Free accounts are limited
            to one analysis per day. Upgrade plans increase your daily limit as described on the
            pricing page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">4. Acceptable use</h2>
          <p>
            You may not use Viraleo to scrape, reverse-engineer, or compete with the service.
            Automated access via bots or scripts is prohibited without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">5. Cancellation</h2>
          <p>
            You may cancel your subscription at any time from your account dashboard. Cancellation
            takes effect immediately and your credits reset to the free tier limit. No refunds for
            partial billing periods.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">6. Limitation of liability</h2>
          <p>
            Viraleo is provided "as is" without warranties. We are not liable for any damages
            arising from your use of the service, including but not limited to lost revenue or
            opportunity.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
