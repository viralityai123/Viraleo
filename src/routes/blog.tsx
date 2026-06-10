import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Viraleo | YouTube Growth & Channel Intelligence" },
      {
        name: "description",
        content:
          "Learn how to grow your YouTube channel with data-driven insights. Thumbnail optimization, niche research, shadowban detection, and more from the Viraleo team.",
      },
      { property: "og:title", content: "Blog — Viraleo | YouTube Growth & Channel Intelligence" },
      {
        property: "og:description",
        content: "Learn how to grow your YouTube channel with data-driven insights.",
      },
      { property: "og:image", content: "https://viraleo.pro/og-image.png" },
      { property: "og:url", content: "https://viraleo.pro/blog" },
      { name: "twitter:title", content: "Blog — Viraleo" },
      { name: "twitter:description", content: "YouTube growth guides from the Viraleo team." },
      { name: "twitter:image", content: "https://viraleo.pro/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/blog" }],
  }),
  component: BlogIndex,
});

const ARTICLES = [
  {
    slug: "thumbnails-matter",
    title: "Why Thumbnails Are The #1 Factor for YouTube Success in 2026",
    excerpt:
      "Your thumbnail determines 80% of whether a viewer clicks. We analyze data from 10,000+ viral videos to show you exactly what makes a winning thumbnail — and how to design one in minutes.",
    date: "June 1, 2026",
    readTime: "6 min",
    tags: ["Thumbnails", "CTR Optimization"],
  },
  {
    slug: "niche-finding-guide",
    title: "How to Find a Profitable YouTube Niche: A Data-Driven Guide",
    excerpt:
      "Most creators pick niches by gut feel and burn out. We break down how to use RPM data, competition analysis, and outlier detection to find a niche where you can actually grow.",
    date: "May 28, 2026",
    readTime: "8 min",
    tags: ["Niche Research", "Strategy"],
  },
];

function BlogIndex() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="mb-16">
          <div className="text-emerald-600 text-sm font-bold tracking-widest uppercase mb-3">
            Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-ink tracking-tight">
            YouTube growth,
            <br />
            decoded.
          </h1>
          <p className="mt-4 text-ink-soft text-lg max-w-xl">
            Data-driven guides, case studies, and strategies to help you grow your channel with
            confidence instead of guesswork.
          </p>
        </div>
        <div className="space-y-8">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}` as any}
              className="block group rounded-2xl border border-hairline bg-white p-6 hover:shadow-lg hover:border-emerald-200 transition-all"
            >
              <div className="flex items-center gap-3 text-xs text-ink-soft mb-3">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {article.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {article.readTime}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-ink group-hover:text-emerald-600 transition-colors">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{article.excerpt}</p>
                  <div className="flex items-center gap-2 mt-4">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight
                  size={20}
                  className="text-ink-soft group-hover:text-emerald-500 shrink-0 mt-1 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
