import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/niche-finding-guide")({
  head: () => ({
    meta: [
      { title: "How to Find a Profitable YouTube Niche — Viraleo" },
      {
        name: "description",
        content:
          "Data-driven guide to finding a profitable YouTube niche. Learn how to analyze monetization potential, competition levels, outlier potential, and audience demand before you start creating.",
      },
      { property: "og:title", content: "How to Find a Profitable YouTube Niche — Viraleo" },
      {
        property: "og:description",
        content: "Data-driven guide to finding a profitable YouTube niche.",
      },
      { property: "og:image", content: "https://viraleo.pro/og-image.png" },
      { property: "og:url", content: "https://viraleo.pro/blog/niche-finding-guide" },
      { name: "twitter:title", content: "How to Find a Profitable YouTube Niche" },
      { name: "twitter:description", content: "Find a YouTube niche where you can actually grow." },
      { name: "twitter:image", content: "https://viraleo.pro/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/blog/niche-finding-guide" }],
  }),
  component: NicheArticle,
});

function NicheArticle() {
  return (
    <main className="min-h-screen bg-surface">
      <article className="max-w-2xl mx-auto px-6 py-24">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-emerald-600 transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to blog
        </Link>

        <div className="flex items-center gap-3 text-xs text-ink-soft mb-4">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            May 28, 2026
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />8 min read
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-ink tracking-tight leading-tight">
          How to Find a Profitable YouTube Niche: A Data-Driven Guide
        </h1>

        <div className="mt-10 space-y-5 text-[15px] text-ink leading-relaxed">
          <p>
            Most creators pick a niche because they're interested in the topic. That's not wrong —
            but it's incomplete. The most successful channels sit at the intersection of{" "}
            <strong>creator passion, audience demand, and low competition</strong>.
          </p>
          <p>
            Here's the framework we use at Viraleo to evaluate niche potential, based on data from
            thousands of YouTube channels.
          </p>

          <h2 className="text-xl font-bold text-ink pt-4">Step 1: Check RPM Data</h2>
          <p>
            RPM (Revenue Per Mille / 1000 views) tells you how much money a niche actually generates
            per thousand views. Gaming averages around $2-3 RPM. Finance? $15-30. Education sits
            around $8-12.
          </p>
          <p>
            Use YouTube analytics tools or Viraleo's Niche Ranker to see real RPM data for any
            niche. A niche with high RPM but low competition is the sweet spot.
          </p>

          <h2 className="text-xl font-bold text-ink pt-4">Step 2: Measure Competition Density</h2>
          <p>
            A niche isn't "saturated" just because big channels exist in it. Saturation means the
            top 10 channels capture 80%+ of the views. In a healthy niche, there's room for mid-tier
            and emerging creators.
          </p>
          <p>
            Look for niches where the #1 channel gets 2-5M views per month but the #10 channel still
            gets 200K+. That spread indicates room to grow.
          </p>

          <h2 className="text-xl font-bold text-ink pt-4">Step 3: Identify Outlier Potential</h2>
          <p>
            The best niches have an "outlier factor" — videos that dramatically outperform the
            channel's average. A niche where a small channel can randomly blow up with 10M views is
            more valuable than one where growth is strictly linear.
          </p>
          <p>
            Viraleo's Niche Ranker calculates the outlier index for any niche. An index above 2.0x
            means there's significant viral potential.
          </p>

          <h2 className="text-xl font-bold text-ink pt-4">Step 4: Validate With Real Data</h2>
          <p>
            Don't trust your gut. Use the Niche Ranker to compare up to 3 niches side-by-side. Look
            at:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Average views per channel in the top 20</li>
            <li>Median RPM across the niche</li>
            <li>Outlier index (viral ceiling)</li>
            <li>Growth rate of the top 5 channels (are they rising or flat?)</li>
            <li>Thumbnail CTR benchmarks for the niche</li>
          </ul>

          <h2 className="text-xl font-bold text-ink pt-4">Real Example: Sub-Niche Strategy</h2>
          <p>
            A creator we worked with wanted to start a "productivity" channel. Direct competition
            was fierce — 200K+ subscriber channels dominating every keyword. But when they narrowed
            to "productivity for ADHD creators," competition dropped 80% while viewer engagement
            actually increased.
          </p>
          <p>
            The sub-niche had lower total search volume but <strong>4x higher RPM</strong> and
            significantly less competition. That's where real growth happens.
          </p>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mt-8">
            <p className="text-sm font-semibold text-emerald-800">
              Ready to find your niche? Run a Niche Ranker analysis in Viraleo and get real RPM
              data, competition scores, and outlier potential — not guesses.
            </p>
            <Link
              to="/niche-ranker"
              search={{} as any}
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Try Niche Ranker <ArrowLeft size={14} className="rotate-180" />
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
