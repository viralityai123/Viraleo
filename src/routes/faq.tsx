import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Viraleo" },
      {
        name: "description",
        content:
          "Frequently asked questions about Viraleo's YouTube channel intelligence tools, pricing, and how it works.",
      },
      { property: "og:title", content: "FAQ — Viraleo" },
      { property: "og:description", content: "Frequently asked questions about Viraleo." },
      { name: "twitter:title", content: "FAQ — Viraleo" },
      { name: "twitter:description", content: "FAQs about Viraleo." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/faq" }],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    q: "What is Viraleo?",
    a: "Viraleo is an AI-powered YouTube channel intelligence platform. It helps creators analyze thumbnails, rank niches, detect shadowbans, and audit videos before uploading — using the same data patterns that drive viral channels.",
  },
  {
    q: "How does the Thumbnail Test work?",
    a: "Upload or paste a thumbnail URL. Our AI scores it based on face detection, text overlay, contrast, brightness, saturation, and synergy with the video title. You get a predicted CTR score and specific recommendations to improve it.",
  },
  {
    q: "What is the Niche Ranker?",
    a: "Enter a YouTube niche or channel. We analyze saturation, trend velocity, monetization potential, and breakthrough difficulty using real channel data to tell you if it's a good niche to enter.",
  },
  {
    q: "How does the Shadowban Detector work?",
    a: "We analyze your channel across four signal categories: search indexability, metadata health, engagement velocity, and community health. Each gets a score and we provide a step-by-step recovery protocol if suppression is detected.",
  },
  {
    q: "What is the Pre-Upload Audit?",
    a: "Upload your video file before publishing. We analyze hook strength, editing quality, file issues, and estimated retention curves. Get actionable recommendations before you hit publish.",
  },
  {
    q: "How many credits do I get?",
    a: "Free plan: 1 analysis per month. Creator: 10 per month. Pro: 25 per month. Credits reset monthly. Unused credits don't roll over.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. Go to your Account page and select a new plan. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.",
  },
  {
    q: "How do payments work?",
    a: "We use LemonSqueezy for payment processing. They accept all major credit cards, PayPal, and Apple Pay. Your payment info is handled securely by LemonSqueezy — we never see your card details.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Go to your Account page > Plan tab and select the Free plan, or contact us to cancel. Your access continues until the end of the billing period.",
  },
  {
    q: "What is the Partner Program?",
    a: "You earn 50% recurring commission on every sale you refer. Generate your unique invite link from your Partner Dashboard and share it. When someone signs up and purchases via your link, you get paid.",
  },
  {
    q: "How do partner payouts work?",
    a: "Enter your bank details in the Partner Dashboard. When you request a payout, we process it via Wise API. Payouts are sent to your bank account within 3-5 business days.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. All analysis data is stored locally in your browser or in our encrypted Redis database. We don't share your channel data with third parties. See our Privacy Policy for details.",
  },
  {
    q: "I need help. How do I contact support?",
    a: "Email us at virality.ai123@gmail.com. We typically respond within 24 hours during business days.",
  },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-white text-ink font-text">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="text-[13px] text-emerald-600 font-bold hover:underline mb-6 inline-block"
        >
          &larr; Back to home
        </Link>
        <h1 className="font-display text-[32px] font-black text-ink mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-[15px] text-ink-soft mb-10">
          Everything you need to know about Viraleo.
        </p>

        <Accordion type="multiple" className="space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-hairline rounded-2xl overflow-hidden px-5"
            >
              <AccordionTrigger className="text-[14px] font-semibold text-ink py-4 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-[13px] text-ink-soft pb-4 leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center border border-hairline rounded-2xl p-8">
          <MessageCircle size={24} className="mx-auto text-emerald-500 mb-3" />
          <h2 className="text-[16px] font-bold text-ink mb-1">Still have questions?</h2>
          <p className="text-[13px] text-ink-soft mb-4">We're here to help.</p>
          <a
            href="mailto:virality.ai123@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-600 transition"
          >
            <Mail size={15} />
            Email support
          </a>
        </div>
      </div>
    </div>
  );
}
