import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/leads")({
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Fresh Design Leads, Daily — $150/mo" },
      {
        name: "description",
        content:
          "A live system hunts Threads and Reddit 24/7 and delivers fresh web design, UI/UX and video leads straight to you. $150/month. Free 3-lead sample.",
      },
    ],
  }),
});

const STEPS = [
  {
    n: "01",
    title: "The system hunts 24/7",
    body: "A live bot sweeps Threads and Reddit around the clock for people actively looking to hire designers — websites, UI/UX, branding, video editing.",
  },
  {
    n: "02",
    title: "AI scores and drafts",
    body: "Every lead is scored on buying intent (90+ = hiring now) and comes with two ready-to-send reply drafts written for you, plus a same-day offer for hot leads.",
  },
  {
    n: "03",
    title: "You just reply",
    body: "One queue page. Open it, read the lead, hit copy, send. New leads land automatically every few minutes — no refreshing, no searching.",
  },
];

const WHAT_YOU_GET = [
  "30+ fresh, scored design leads every day",
  "Hiring posts (90+ intent) automatically sorted to the top",
  "AI-written reply drafts that reference your portfolio",
  "Same-day offer draft for hot leads — close fast",
  "Works for web design, UI/UX, branding, video editing",
];

function LeadsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">
          Designers · Freelancers · Agencies
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground">
          Stop hunting clients.
          <br />
          Let the machine do it.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A live system scans Threads and Reddit 24/7 for people hiring designers right now,
          scores each one on buying intent, and delivers the hot leads to you with ready-to-send
          reply drafts. You reply, you close.
        </p>

        <div className="mt-10 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-8">
          <div className="text-sm text-muted-foreground">Designer Lead Feed</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-foreground">$150</span>
            <span className="text-muted-foreground">/month — cancel anytime</span>
          </div>
          <ul className="mt-6 space-y-3">
            {WHAT_YOU_GET.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-0.5 text-emerald-500">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl border border-border bg-background p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Not sure yet? Get a free sample
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              DM{" "}
              <a
                href="https://www.threads.net/@mue.menti"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-500 hover:underline"
              >
                @mue.menti on Threads
              </a>{" "}
              or email{" "}
              <a
                href="mailto:virality.ai123@gmail.com"
                className="font-semibold text-emerald-500 hover:underline"
              >
                virality.ai123@gmail.com
              </a>{" "}
              — I'll send you 3 real hot leads today, free.
            </p>
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold text-foreground">How it works</h2>
          <div className="mt-6 space-y-6">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="text-lg font-extrabold text-emerald-500">{s.n}</span>
                <div>
                  <div className="font-semibold text-foreground">{s.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-2xl border border-border p-8 text-center">
          <div className="text-lg font-bold text-foreground">
            One subscribed client's first week usually covers a month
          </div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            You're one reply away from never having an empty week again. Get your free 3-lead
            sample today.
          </p>
          <a
            href="mailto:virality.ai123@gmail.com?subject=Lead%20feed%20sample"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Get my free 3-lead sample
          </a>
        </div>
      </div>
    </div>
  );
}
