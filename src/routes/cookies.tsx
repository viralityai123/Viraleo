import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/landing-v2/LegalLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies — Viraleo" },
      { name: "description", content: "Viraleo Cookie Policy. Learn how we use cookies and similar technologies." },
      { property: "og:title", content: "Cookies — Viraleo" },
      { property: "og:description", content: "Viraleo Cookie Policy." },
      { name: "twitter:title", content: "Cookies — Viraleo" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalLayout>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Cookie Policy</h1>
      <p className="text-sm text-[#5b5b66] mb-10">Last updated: May 27, 2026</p>

      <div className="space-y-8 text-[15px] leading-relaxed text-[#5b5b66]">
        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">1. What are cookies</h2>
          <p>
            Cookies are small text files stored on your device by your browser. They help us
            remember your session, preferences, and provide a functional experience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">2. How we use cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We also use
            analytics cookies (anonymized) to understand feature usage and improve the product.
            No tracking cookies are used for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">3. Third-party cookies</h2>
          <p>
            YouTube embeds on the platform may set their own cookies. We have no control over
            these. Please refer to Google's cookie policy for more information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">4. Managing cookies</h2>
          <p>
            You can disable cookies in your browser settings. Note that doing so may break
            core functionality like login and analysis reports.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#07070a] mb-2">5. Contact</h2>
          <p>
            For cookie-related questions, email{" "}
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
