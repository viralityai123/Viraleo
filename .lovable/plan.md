## Goal

Bring your uploaded `channel-compass` app into this empty Lovable project and ship a completely new landing page at `/` — Apple-font typography, viewmax.io / viewstats-style motion graphics, design language pulled from your existing channel pages (pre-analysis, blueprint, intel, account). The current `LandingPage.tsx` and `landing-data.ts` will be retired and not referenced.

## Step 1 — Scaffold + import the codebase

1. Scaffold a TanStack Start `web_app` artifact (same stack as your zip).
2. Overlay the uploaded project on top:
   - `src/` (routes, components, hooks, lib, styles.css, router.tsx, server.ts, start.ts, routeTree.gen.ts)
   - `public/`
   - config files: `components.json`, `vite.config.ts`, `tsconfig.json`, `bunfig.toml`, `wrangler.jsonc`, `eslint.config.js`
3. Merge `package.json` dependencies into the scaffolded one; add `gsap` and `@gsap/react`.
4. Drop dev junk: `find-lines.ts`, `fix_syntax.cjs`, `test-*.ts`.
5. Confirm dev server boots and existing routes (`/pre-analysis`, `/account`, `/history`, `/niche-ranker`, `/shadowban-detector`, `/thumbnail-test`) render unchanged.

## Step 2 — Retire the old landing

- Delete `src/components/landing/` entirely (including `LandingPage.tsx`, `landing-data.ts`, `landing.css`, all section files).
- Remove the loader redirect in `src/routes/index.tsx` and make `/` render the new landing component directly.
- Remove `fetch-landing-showcase` usage if it's only referenced by the old landing.

## Step 3 — Visual system (matched to channel pages)

Audit `pre-analysis`, `blueprint`, `intel`, `account` for tokens, then commit to:

- **Typography**: SF Pro Display / SF Pro Text via system stack `-apple-system, "SF Pro Display", "SF Pro Text", "Inter", ...` with tight tracking on display sizes (`-0.04em`), weight 600–700 for hero, 400 for body. Same scale used by the other pages.
- **Color tokens**: reuse `--background`, `--foreground`, `--primary`, `--muted`, etc. from `styles.css` so the landing sits inside the same design system as `/pre-analysis`.
- **Surface treatment**: glass cards, subtle borders, soft shadows, generous radii (`--radius-3xl` / `--radius-4xl`) — pulled from the existing `ChannelDigestCard` and blueprint components.
- **Iconography**: same `lucide-react` set the channel pages use; keep ViralityLogo as the brand mark.

## Step 4 — New landing composition (viewmax / viewstats inspired)

Single new file `src/components/landing-v2/LandingV2.tsx`, broken into co-located section components. Composition:

1. **Sticky glass nav** — minimal: logo left, 3 links + a primary CTA right.
2. **Cinema hero** — oversized Apple-font headline with per-word stagger reveal (Framer Motion), animated gradient mesh behind, real channel/thumbnail tiles drifting in 3D (GSAP parallax tied to mouse + scroll). One CTA, one ghost link.
3. **Live product mock** — a stylized device frame showing a screenshot of the actual `/pre-analysis` or `/blueprint` UI, with floating data chips (RPM, CTR, view velocity) animating in around it (viewstats-style).
4. **Scroll-pinned feature reel** — GSAP ScrollTrigger pins the section; copy on the left swaps as the right-hand visual morphs through 4 product capabilities (Pre-Analysis, Blueprint, Intel Digest, Shadowban).
5. **Numbers strip** — count-up metrics on enter, hairline dividers, Apple-style typography.
6. **Marquee of channels/thumbnails** — dual-row infinite marquee, hover to pause; uses static thumbnails shipped in `/public`, not the old landing-data fetcher.
7. **Comparison / "Why" section** — 2-column split, large type, tasteful color accent from the design tokens.
8. **Pricing** — 3 cards, the middle one elevated; mirrors plan tiers from `src/lib/credits.ts` so it stays accurate.
9. **FAQ** — accordion using the existing ui/accordion primitive.
10. **Final CTA** — full-bleed, animated gradient orb, single button.
11. **Minimal footer** — logo, small print, socials.

## Step 5 — Motion direction

- **Framer Motion**: per-word/letter staggers, in-view reveals, layout transitions on cards, hover micro-interactions.
- **GSAP + ScrollTrigger** (via `@gsap/react`): pinned feature reel, parallax hero tiles, count-ups, marquee, gradient-orb morph. Respect `prefers-reduced-motion`.
- Keep 60fps: transforms + opacity only, no layout thrash; lazy-mount heavy sections with `IntersectionObserver`.

## Step 6 — Wire-up and QA

- Route `/` → `LandingV2`. Update meta/title for SEO (single H1, descriptive title under 60 chars, meta description under 160).
- Verify all CTAs route to existing pages (`/pre-analysis`, `/account`, etc.).
- Check console + network for errors; confirm channel pages still work and share the new landing's visual language.

## Technical notes

- Stack stays: TanStack Start + Router, React 19, Tailwind v4, Radix UI, Framer Motion. Adding: `gsap`, `@gsap/react`.
- No backend changes; landing reads only static data + (optionally) `src/lib/credits.ts` plan tiers.
- Reduced-motion path: swap pinned ScrollTrigger sections for simple fade-ins.
- File map for new landing:
  ```text
  src/components/landing-v2/
    LandingV2.tsx
    Nav.tsx
    Hero.tsx
    ProductMock.tsx
    FeatureReel.tsx        # GSAP pinned
    Metrics.tsx            # count-ups
    ChannelMarquee.tsx
    WhySplit.tsx
    Pricing.tsx
    Faq.tsx
    FinalCta.tsx
    Footer.tsx
    motion.ts              # shared variants + GSAP helpers
    landing-v2.css         # font stack + section-scoped styles
  ```
