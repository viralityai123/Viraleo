import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/landing-v2/LegalLayout";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Viraleo" },
      {
        name: "description",
        content: "Viraleo Privacy Policy. Learn how we collect, use, and protect your data.",
      },
      { property: "og:title", content: "Privacy Policy — Viraleo" },
      { property: "og:description", content: "Viraleo Privacy Policy." },
      { name: "twitter:title", content: "Privacy Policy — Viraleo" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/privacy-policy" }],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <LegalLayout>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#5b5b66] mb-10">Last updated: May 27, 2026</p>

      <div className="space-y-8 text-[15px] leading-relaxed text-[#5b5b66]">
        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">1. What we collect</h2>
          <p>
            We collect only the data you explicitly provide: channel URLs you submit for analysis,
            account email if you register, and basic usage analytics (page views, feature usage). We
            never access your YouTube account credentials or private videos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">2. How we use it</h2>
          <p>
            Your data powers your analysis reports. Channel URLs are processed against public
            YouTube data and stored temporarily to cache results. Email is used for account
            management and essential service communications only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">3. Data retention</h2>
          <p>
            Analysis reports are retained for 30 days. Account data is kept until you delete your
            account. Usage analytics are anonymized after 12 months.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">4. Third parties</h2>
          <p>
            We use YouTube's public API for channel data. We do not sell your data to any third
            party. We do not share personal information with advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">5. Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by contacting us. You can also export your analysis history from your account dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">6. Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
            <a href="mailto:privacy@viraleo.pro" className="underline hover:text-[#07070a]">
              privacy@viraleo.pro
            </a>
            .
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
