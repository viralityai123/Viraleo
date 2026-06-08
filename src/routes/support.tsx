import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Bot, User, Sparkles, CreditCard, ShieldAlert, CircleHelp, ExternalLink } from "lucide-react";
import { generateLLMContent } from "@/lib/llm";

const getAiSupportResponse = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data }) => {
    const prompt = `You are Viraleo AI Support. Answer the user's question concisely and helpfully.

About Viraleo:
- Viraleo is an AI-powered YouTube channel intelligence platform
- 4 tools: Pre-Analysis, Thumbnail Test, Niche Ranker, Shadowban Detector
- Free plan: 1 analysis/day. Creator ($20/mo): 10/day. Pro ($50/mo): 25/day
- No refunds once credits are used
- Payments via LemonSqueezy (credit cards, PayPal, Apple Pay)
- Google OAuth only — no email/password login
- Contact: virality.support@gmail.com (24hr response)

User question: ${data.message}

Keep responses under 3 paragraphs. Use markdown for formatting. Be friendly but professional.`;

    try {
      return await generateLLMContent(prompt);
    } catch {
      return "Sorry, I'm having trouble connecting. Please email **virality.support@gmail.com** and we'll get back to you within 24 hours.";
    }
  });

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "AI Support — Viraleo" },
      { name: "description", content: "Get help with Viraleo's AI-powered YouTube tools. Chat with our AI assistant for instant answers to billing, credits, tools, and account questions." },
      { property: "og:title", content: "AI Support — Viraleo" },
      { property: "og:description", content: "AI-powered support for Viraleo YouTube tools." },
      { property: "og:image", content: "https://viraleo.pro/og-image.png" },
      { property: "og:url", content: "https://viraleo.pro/support" },
      { name: "twitter:title", content: "AI Support — Viraleo" },
      { name: "twitter:description", content: "Instant AI support for Viraleo." },
      { name: "twitter:image", content: "https://viraleo.pro/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/support" }],
  }),
  component: SupportPage,
});

const QUICK_ACTIONS = [
  { icon: CreditCard, label: "Billing Issue", msg: "I have a billing question" },
  { icon: Sparkles, label: "How Credits Work", msg: "How do credits work?" },
  { icon: ShieldAlert, label: "Shadowban Help", msg: "Am I shadowbanned?" },
];

type Message = { role: "user" | "ai"; text: string };

function SupportPage() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hey! I'm Viraleo AI Support. Ask me anything about your account, billing, credits, or tools. Or pick a quick action below." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send(msg?: string) {
    const text = (msg || input).trim();
    if (!text || typing) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setTyping(true);
    try {
      const reply = await getAiSupportResponse({ data: { message: text } });
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Sorry, something went wrong. Please email **virality.support@gmail.com** and we'll get back to you within 24 hours." }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-widest uppercase mb-4">
            <Bot size={14} /> AI Support
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-ink tracking-tight">How can we help?</h1>
          <p className="mt-3 text-ink-soft text-base max-w-lg mx-auto">
            AI-powered answers in seconds. No wait times, no tickets — just type your question.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left: KB links */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-ink tracking-wider uppercase mb-3">Quick Resources</h2>
              <div className="space-y-2">
                {[
                  { icon: CircleHelp, label: "FAQ", to: "/faq" },
                  { icon: CreditCard, label: "Billing & Plans", to: "/select-plan" },
                  { icon: ExternalLink, label: "Blog & Guides", to: "/blog" },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <Link
                      key={r.label}
                      to={r.to}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-hairline hover:border-emerald-200 hover:shadow-sm transition-all text-sm font-medium text-ink"
                    >
                      <Icon size={16} className="text-emerald-500 shrink-0" />
                      {r.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
              <p className="text-sm font-semibold text-amber-800">No refunds once credits have been used.</p>
              <p className="text-xs text-amber-700 mt-1">
                If you have a billing concern, email{" "}
                <a href="mailto:virality.support@gmail.com" className="underline font-medium">virality.support@gmail.com</a>.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
              <p className="text-sm font-semibold text-emerald-800">Still stuck?</p>
              <p className="text-xs text-emerald-700 mt-1">
                Email us at{" "}
                <a href="mailto:virality.support@gmail.com" className="underline font-medium">virality.support@gmail.com</a>{" "}
                and we'll get back to you within 24 hours.
              </p>
            </div>
          </div>

          {/* Right: Chat widget */}
          <div className="md:col-span-3">
            <div className="rounded-2xl bg-white border border-hairline shadow-sm overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-hairline bg-gradient-to-r from-emerald-500 to-emerald-600">
                <div className="size-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Viraleo AI</div>
                  <div className="text-[11px] text-white/70">Online — Answers in seconds</div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[400px] overflow-y-auto p-5 space-y-4 bg-[#fafafa]">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                    {m.role === "ai" && (
                      <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={14} className="text-emerald-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        m.role === "user"
                          ? "bg-emerald-500 text-white rounded-br-md"
                          : "bg-white border border-hairline text-ink rounded-bl-md shadow-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.role === "user" && (
                      <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex gap-3">
                    <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-emerald-600" />
                    </div>
                    <div className="bg-white border border-hairline rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>

              {/* Quick actions */}
              <div className="px-5 py-3 border-t border-hairline bg-white">
                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_ACTIONS.map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.label}
                        onClick={() => { setOpen(true); send(q.msg); }}
                        disabled={typing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Icon size={12} />
                        {q.label}
                      </button>
                    );
                  })}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    placeholder="Type your question..."
                    disabled={typing}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-hairline bg-surface text-sm text-ink placeholder:text-ink-soft outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || typing}
                    className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
