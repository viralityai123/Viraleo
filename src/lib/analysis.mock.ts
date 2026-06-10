/**
 * Type definitions for dashboard analysis UI.
 * Production paths use @/lib/youtube/* for real public channel intelligence.
 * The analyze() helper below is deprecated and not used in production routes.
 */
export type ChannelMode = "shorts" | "long" | "hybrid";

export interface ChannelMeta {
  handle: string;
  name: string;
  subs: string;
  avatarColor: string;
  letter: string;
  detected: ChannelMode;
  thumbnailUrl?: string;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SUBS = ["1.2M", "4.8M", "12.3M", "47M", "112M", "469M"];
const COLORS = ["#ff0000", "#1a1a2e", "#0f4c81", "#18181b", "#14532d", "#4a044e", "#b45309"];

export function detectChannel(input: string): ChannelMeta {
  const clean = input.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/^@/, "");
  const handle = clean.split(/[/?#]/)[0] || "channel";
  const h = hash(handle);
  const detectedIdx = h % 3;
  const detected: ChannelMode =
    detectedIdx === 0 ? "shorts" : detectedIdx === 1 ? "long" : "hybrid";
  return {
    handle,
    name: handle.charAt(0).toUpperCase() + handle.slice(1),
    subs: SUBS[h % SUBS.length],
    avatarColor: COLORS[h % COLORS.length],
    letter: handle.charAt(0).toUpperCase(),
    detected,
  };
}

export interface Insight {
  label: string;
  detail: string;
  score?: number;
}

export interface HookIdea {
  type: string;
  hook: string;
  inspiredBy?: string;
}

export interface ObservedHook {
  videoId: string;
  videoTitle: string;
  views: string;
  viewsPerDay: number;
  /** What we can infer without watching — title line, desc snippet, or visual-first note */
  openingHook: string;
  openingSource: "title" | "description" | "visual_thumbnail" | "title_not_hook";
  hookType: string;
  analysis: string;
  thumbnailUrl?: string;
}

export interface PublicDataSummary {
  videosAnalyzed: number;
  subs: string;
  medianViewsPerDay: number;
  avgViewsPerDay: number;
  shortsRatioPct: number;
  uploadCadenceDays: number;
  velocityCliff: boolean;
  topVideoTitle: string;
}

export interface VideoIdea {
  title: string;
  viralScore: number;
  reason: string;
}

export interface ScriptScene {
  t: string;
  beat: string;
  detail: string;
}

export interface Script {
  title: string;
  hook: string;
  scenes: ScriptScene[];
  cta: string;
  cliffhanger: string;
}

const PATTERNS_SHORTS = [
  ["Pattern interrupt at 0:00", "Sudden visual or sound shift in first 0.4s stops the swipe."],
  ["Loop-back ending", "Last frame visually matches the first → triggers replay."],
  ["Mid-hook escalation", "Stakes raised at 4–6s prevents 50% drop-off."],
  ["Ambiguous setup", "Question implied, not stated → drives curiosity gap."],
  ["Caption-led storytelling", "Captions carry 70% of meaning, audio optional."],
  ["3-act compression", "Setup→twist→payoff in 22–28s window."],
];
const WEAK_SHORTS = [
  ["Slow intros", "First 2s used for branding kills retention 38%."],
  ["Talking-head openers", "Static face under-performs by 2.4× vs motion."],
  ["Caption fatigue", "Same font/position for 6+ shorts reduces saves."],
  ["No replay bait", "Endings fade out instead of looping."],
  ["Format reuse", "Same template 4× in a row triggers algorithm cooldown."],
  ["Low emotional swing", "Flat affect → 22% lower retention."],
];
const OPP_SHORTS = [
  ["POV stitches", "Underused angle in this niche; 3× viral median."],
  ["Reaction-to-data shorts", "Rising 47% MoM in adjacent channels."],
  ["Skill compression", "‘In 30s’ format has high replay potential."],
  ["Behind-the-scenes loops", "Low competition, high save rate."],
  ["Tier-list shorts", "Comments-driven engagement is 4× baseline."],
];
const HOOKS_SHORTS: HookIdea[] = [
  { type: "Scroll-stop", hook: "Don’t scroll if you’ve ever ___" },
  { type: "Scroll-stop", hook: "This is the part nobody shows you about ___" },
  { type: "Curiosity", hook: "I tried ___ for 30 days. Day 4 broke me." },
  { type: "Curiosity", hook: "Everyone gets ___ wrong. Here’s the proof." },
  { type: "Tension", hook: "If you do this, stop right now." },
  { type: "Tension", hook: "You have 10 seconds before this gets weird." },
  { type: "Emotional", hook: "I almost gave up. Then this happened." },
  { type: "Emotional", hook: "She didn’t know the camera was still on." },
  { type: "Replay-bait", hook: "Watch the background. Trust me." },
  { type: "Replay-bait", hook: "There’s something hidden at second 12." },
];
const IDEAS_SHORTS: VideoIdea[] = [
  {
    title: "I copied a viral format with 1 twist",
    viralScore: 92,
    reason: "High pattern-match + novelty delta",
  },
  {
    title: "30 seconds that change how you see ___",
    viralScore: 88,
    reason: "Save-rate magnet + replay loop",
  },
  {
    title: "POV: you discover ___ for the first time",
    viralScore: 84,
    reason: "Emotional opener, low-comp",
  },
  {
    title: "The 3-second test nobody passes",
    viralScore: 81,
    reason: "Interactive bait → comments",
  },
  {
    title: "I rebuilt ___ from scratch in 30s",
    viralScore: 78,
    reason: "Compression format trending",
  },
];

const PATTERNS_LONG = [
  ["Cold-open hook", "First 18s reframes the whole video before titles."],
  ["Open loops", "3+ unresolved questions kept active until the payoff."],
  ["Story arc binding", "Each chapter ends on a micro-cliffhanger."],
  ["Visual variety cycles", "B-roll change every 4–7s sustains attention."],
  ["Authority anchoring", "Cite a source within first 90s → trust spike."],
  ["Payoff stacking", "Reward the viewer 3 times before the main payoff."],
];
const WEAK_LONG = [
  ["Weak first 30s", "Average drop is 41% before the value lands."],
  ["Thumbnail/title mismatch", "CTR-baited but content delivers something else."],
  ["Mid-video lull at 4:00", "B-roll repetition causes second drop."],
  ["No audience re-engagement", "No callback or recap by 60% mark."],
  ["Anti-climactic ending", "Outro doesn’t earn the runtime."],
];
const OPP_LONG = [
  ["Investigative deep-dives", "Trending +63% MoM in your niche."],
  ["Multi-part series", "Binge factor 2.1× vs standalone."],
  ["Reaction-to-document", "Underused, drives comment storms."],
  ["Behind-the-decision content", "Low competition, high session-time."],
];
const TITLES_LONG = [
  "I spent 100 hours doing ___ so you don’t have to",
  "The truth about ___ nobody is saying",
  "Why ___ broke and how to fix it (for real)",
  "I tried every ___ — only one was worth it",
  "We were lied to about ___",
  "___: the rise, the fall, the comeback",
];
const IDEAS_LONG: VideoIdea[] = [
  {
    title: "The hidden economy behind ___",
    viralScore: 91,
    reason: "High session-time + binge potential",
  },
  {
    title: "I ranked every ___ from worst to best",
    viralScore: 86,
    reason: "Tier-list format = comment magnet",
  },
  { title: "Why nobody talks about ___", viralScore: 83, reason: "Curiosity gap + authority play" },
  { title: "Inside the world of ___", viralScore: 80, reason: "Documentary-style retention" },
];

export type MomentType =
  | "hook"
  | "retention-dip"
  | "retention-spike"
  | "replay"
  | "swipe-stop"
  | "emotion"
  | "pacing"
  | "caption";

export interface VideoMoment {
  t: number; // seconds
  type: MomentType;
  label: string;
  detail: string;
}

export interface TopVideo {
  id: string; // youtube video id
  title: string;
  views: string;
  duration: number; // seconds
  isShort: boolean;
  moments: VideoMoment[];
}

export interface Analysis {
  patterns: Insight[];
  weaknesses: Insight[];
  opportunities: Insight[];
  observedHooks?: ObservedHook[];
  hookFormula?: string;
  hooks: HookIdea[];
  ideas: VideoIdea[];
  titles?: string[];
  growth: {
    uploadTime: string;
    idealLength: string;
    frequency: string;
    viral: number;
    replay: number;
    saturation: number;
  };
  thumbnail: { analysis: Insight[]; concepts: string[] };
  blueprint: string[];
  script?: Script;
  topVideo: TopVideo;
}

const SHORT_IDS = ["tPEE9ZwTmy0", "qWNQUvIk954", "Mh4f9AYRCZY", "JXeJANDKwDc", "8wxOVn99FTE"];
const LONG_IDS = ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk", "OPf0YbXqDm0", "RgKAFK5djSk"];
const VIEWS = ["1.2M", "4.8M", "12M", "47M", "89M", "112M"];

function buildTopVideo(channel: string, isShorts: boolean, seed: number): TopVideo {
  if (isShorts) {
    return {
      id: SHORT_IDS[seed % SHORT_IDS.length],
      title: `${channel}'s most-viewed Short`,
      views: VIEWS[seed % VIEWS.length],
      duration: 28,
      isShort: true,
      moments: [
        {
          t: 0,
          type: "hook",
          label: "Pattern interrupt",
          detail: "Hard cut + sound spike. Eye locked in 0.4s.",
        },
        {
          t: 1,
          type: "caption",
          label: "3-word caption pop",
          detail: "Bold yellow caption assumes sound off.",
        },
        {
          t: 3,
          type: "swipe-stop",
          label: "Curiosity gap planted",
          detail: "Implied question keeps thumb off the screen.",
        },
        {
          t: 6,
          type: "retention-spike",
          label: "Open loop escalation",
          detail: "Stakes raised — retention bumps +12%.",
        },
        {
          t: 11,
          type: "retention-dip",
          label: "Mini-lull",
          detail: "B-roll repeats — 8% drop here. Re-cut suggested.",
        },
        {
          t: 14,
          type: "emotion",
          label: "Reaction beat",
          detail: "Face emotion spike — saves cluster here.",
        },
        {
          t: 20,
          type: "pacing",
          label: "Cut acceleration",
          detail: "Cuts every 0.6s drives the payoff.",
        },
        {
          t: 24,
          type: "retention-spike",
          label: "Payoff lands",
          detail: "Promise from 0:03 resolved.",
        },
        {
          t: 27,
          type: "replay",
          label: "Loop-back frame",
          detail: "Last frame matches frame 1 → replay trigger.",
        },
      ],
    };
  }
  return {
    id: LONG_IDS[seed % LONG_IDS.length],
    title: `${channel}'s most-viewed long-form video`,
    views: VIEWS[seed % VIEWS.length],
    duration: 720,
    isShort: false,
    moments: [
      {
        t: 0,
        type: "hook",
        label: "Cold open reframe",
        detail: "First 18s recontextualizes the topic.",
      },
      {
        t: 18,
        type: "retention-spike",
        label: "Stakes promise",
        detail: "Payoff promised — retention holds 92%.",
      },
      {
        t: 90,
        type: "swipe-stop",
        label: "Open loop #1",
        detail: "First unresolved question planted.",
      },
      {
        t: 180,
        type: "caption",
        label: "Authority anchor",
        detail: "Source cited on screen — trust spike.",
      },
      {
        t: 240,
        type: "retention-dip",
        label: "Mid-video lull",
        detail: "B-roll repetition — 15% drop. Re-edit.",
      },
      {
        t: 360,
        type: "emotion",
        label: "Twist beat",
        detail: "Recontextualizes Chapter 1, comments cluster.",
      },
      {
        t: 510,
        type: "retention-spike",
        label: "Micro-payoff stack",
        detail: "3 small wins refresh attention.",
      },
      {
        t: 630,
        type: "pacing",
        label: "Cut frequency lifts",
        detail: "Climax build — visual variety every 4s.",
      },
      {
        t: 690,
        type: "replay",
        label: "Callback ending",
        detail: "Ties back to cold open — earned runtime.",
      },
    ],
  };
}

export function analyze(channel: string, mode: "shorts" | "long"): Analysis {
  const isShorts = mode === "shorts";
  const P = isShorts ? PATTERNS_SHORTS : PATTERNS_LONG;
  const W = isShorts ? WEAK_SHORTS : WEAK_LONG;
  const O = isShorts ? OPP_SHORTS : OPP_LONG;
  const seed = hash(channel + mode);
  const pick = <T>(arr: T[], n: number, off = 0) =>
    arr.slice(0, n).map((x, i) => arr[(seed + i + off) % arr.length]);

  const ideas = (isShorts ? IDEAS_SHORTS : IDEAS_LONG).map((v) => ({
    ...v,
    title: v.title.replace("___", channel),
  }));

  return {
    patterns: pick(P, 6).map(([label, detail]) => ({ label, detail, score: 70 + (seed % 30) })),
    weaknesses: pick(W, 5, 1).map(([label, detail]) => ({ label, detail })),
    opportunities: pick(O, 4, 2).map(([label, detail]) => ({ label, detail })),
    hooks: HOOKS_SHORTS,
    ideas,
    titles: !isShorts ? TITLES_LONG.map((t) => t.replace("___", channel)) : undefined,
    growth: {
      uploadTime: isShorts ? "5:30 PM – 7:00 PM local" : "Saturday 10:00 AM local",
      idealLength: isShorts ? "27–34s" : "11–14 min",
      frequency: isShorts ? "1–2 / day" : "2 / week",
      viral: 60 + (seed % 35),
      replay: 55 + ((seed >> 2) % 40),
      saturation: 20 + ((seed >> 4) % 35),
    },
    thumbnail: {
      analysis: [
        { label: "Curiosity gap", detail: "Top 20% leverage a visible question." },
        { label: "Face emotion", detail: "Shock + side-eye perform 1.7× vs neutral." },
        { label: "Color contrast", detail: "Red/yellow on dark base wins CTR." },
        { label: "Object focus", detail: "Single hero object beats clutter." },
      ],
      concepts: [
        "Close-up shocked face, blurred dramatic background, bold yellow 2-word overlay",
        "Split-frame before/after with red arrow + handwritten circle",
        "Hero object centered, dark vignette, glowing rim-light",
        "POV hand reaching toward subject, motion blur, 3-word hook",
      ],
    },
    blueprint: isShorts
      ? [
          `Lead with a 0.4s pattern interrupt unique to ${channel}.`,
          "Stack 2 open loops in the first 6 seconds.",
          "Caption-first storytelling — assume sound off.",
          "Land the payoff at 22–26s, then loop the first frame.",
          "Post 1–2× daily in the 5:30–7:00 PM window.",
          "Rotate 3 hook templates weekly to dodge format fatigue.",
        ]
      : [
          `Open with a reframe that recontextualizes ${channel}'s topic.`,
          "Plant 3 open loops within the first 90 seconds.",
          "Insert a micro-payoff every 90s to refresh retention.",
          "Use chapter cliffhangers to bind the binge arc.",
          "End with a callback that earns the runtime.",
          "Ship 2 deeply-researched videos / week, Saturday morning.",
        ],
    script: isShorts
      ? {
          title: `Shorts script for ${channel}`,
          hook: "Don’t scroll — you’ve been doing this wrong your whole life.",
          scenes: [
            {
              t: "0:00",
              beat: "Pattern interrupt",
              detail: "Hard cut + sound spike + on-screen 3-word hook.",
            },
            { t: "0:03", beat: "Setup", detail: "Show the wrong way visually. No talking yet." },
            {
              t: "0:08",
              beat: "Open loop",
              detail: "Tease the twist. ‘But here’s what nobody shows you…’",
            },
            { t: "0:14", beat: "Escalation", detail: "Reveal step 1 with bold caption + B-roll." },
            { t: "0:20", beat: "Payoff", detail: "Final move + emotional reaction." },
            { t: "0:26", beat: "Replay bait", detail: "Visual matches frame 1 → swipe-back loop." },
          ],
          cta: "Follow for the part 2 nobody saw coming.",
          cliffhanger: "Last frame freezes on an unexplained detail to drive replays.",
        }
      : {
          title: `Long-form script for ${channel}`,
          hook: "By the end of this video you’ll see ___ in a way you can’t un-see.",
          scenes: [
            { t: "0:00", beat: "Cold open", detail: "Reframe the topic in 3 sentences." },
            { t: "0:18", beat: "Stakes", detail: "Why this matters now — promise the payoff." },
            { t: "1:30", beat: "Chapter 1", detail: "First open loop + supporting evidence." },
            { t: "4:00", beat: "Chapter 2", detail: "Twist that recontextualizes Chapter 1." },
            { t: "7:30", beat: "Chapter 3", detail: "Stack micro-payoffs + visuals." },
            { t: "10:30", beat: "Climax", detail: "Resolve the original promise with proof." },
            { t: "12:00", beat: "Callback", detail: "Tie back to the cold open." },
          ],
          cta: "Subscribe — next video continues this thread.",
          cliffhanger: "Tease the next investigation in the final 10 seconds.",
        },
    topVideo: buildTopVideo(channel, isShorts, seed),
  };
}
