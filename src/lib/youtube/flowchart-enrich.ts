export interface TimestampSegment {
  time: string;
  action: string;
  whyItWorked: string;
  retentionImpact: string;
}

export interface FlowchartStep {
  step: number;
  title: string;
  detail: string;
  color: string;
  whatHappens?: string;
  whyItWorks?: string;
  timestamp?: string;
}

const GENERIC_PATTERNS = [
  /^the (initial|first|hook|setup|mid|end)/i,
  /first seconds/i,
  /0-5 seconds/i,
  /introduction of the video/i,
  /mid-video pacing/i,
  /emotional connection with the viewers/i,
  /call to action viewers/i,
  /grabs the viewer/i,
  /grab(s)? the viewer/i,
  /video's theme/i,
  /^setup$/i,
  /^first seconds$/i,
  /end cta/i,
  /the video starts with a hook/i,
  /initial 0-5/i,
  /viewer's attention/i,
  /open loop so the audience/i,
  /immediate visual or verbal hook/i,
  /oddly satisfying/i,
  /kinetic sand/i,
  /fluid flowing/i,
  /perfect alignment/i,
  /smooth transformation/i,
  /diverse short clips/i,
  /universal human desire/i,
  /visual\/auditory satisfaction/i,
  /intricate machine operations/i,
  /aesthetic pleasures/i,
  /constant novelty and variety/i,
  /\[channel handle\]/i,
];

export function isGenericFlowDetail(detail: string): boolean {
  const d = detail.trim();
  if (d.length < 55) return true;
  return GENERIC_PATTERNS.some((re) => re.test(d));
}

export function isGenericTimestampAction(action: string): boolean {
  const a = action.trim();
  if (a.length < 40) return true;
  return GENERIC_PATTERNS.some((re) => re.test(a));
}

function formatTimeRange(startSec: number, endSec: number): string {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
  };
  return `${fmt(startSec)} - ${fmt(endSec)}`;
}

/** Ground segments in title + description beats when LLM/captions are vague. */
export function buildTimestampsFromGrounding(
  videoTitle: string,
  durationSec: number,
  descriptionSnippet: string,
  beats: { startSec: number; text: string }[] = []
): TimestampSegment[] {
  const titleHook = videoTitle.replace(/\s*\|.*$/, "").trim();
  const desc = descriptionSnippet.replace(/\n+/g, " ").trim();

  const beatTexts = beats.map((b) => b.text).filter((t) => t.length > 8);
  const descSentences = desc
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
    .slice(0, 6);

  const hookAction =
    beatTexts[0] ||
    (descSentences[0]
      ? `Cold open: "${descSentences[0].slice(0, 120)}"`
      : `Opens on the title promise — "${titleHook}" — so the first frame matches what they clicked.`);

  const loopAction =
    beatTexts[1] ||
    descSentences[1] ||
    `Sets up the problem from "${titleHook}" — what went wrong, what's at stake, or what you're about to prove.`;

  const anchorAction =
    beatTexts[Math.min(2, beatTexts.length - 1)] ||
    descSentences[2] ||
    `Main beats in the middle — gameplay, reveals, reactions, or proof the title isn't clickbait.`;

  const endAction =
    beatTexts[beatTexts.length - 1] ||
    descSentences[descSentences.length - 1] ||
    `Wrap-up: outcome of the challenge, punchline, subscribe/comment CTA, or tease for the next upload.`;

  const t1 = Math.min(12, Math.floor(durationSec * 0.08));
  const t2 = Math.min(60, Math.floor(durationSec * 0.22));
  const t3 = Math.floor(durationSec * 0.35);
  const t4 = Math.floor(durationSec * 0.62);
  const t5 = Math.max(t4 + 10, Math.floor(durationSec * 0.82));

  return [
    {
      time: formatTimeRange(0, t1),
      action: hookAction,
      whyItWorked:
        "The click came from the title and thumbnail — not from the first 10 seconds of content. At 0:00, the viewer is checking 'is this the video I thought I clicked?' If the first frame doesn't visually confirm the thumbnail's promise, they swipe before you even start talking. Think of the thumbnail as a contract: the first frame is where you honor it. Most creators lose here because they open with branding, B-roll, or setup that delays the payoff.",
      retentionImpact: "At 0:00-0:12, the viewer's decision is made in roughly 3 seconds. If they clicked a thumbnail of a huge Minecraft build and you open with a slow pan across a forest, the mismatch is instant. They don't wait for the build to appear — they assume you tricked them and leave. The first frame needs to be the highest-impact visual from the video, period.",
    },
    {
      time: formatTimeRange(t1, t2),
      action: loopAction,
      whyItWorked: "The title and thumbnail set up a question — 'can he actually do this?' or 'what happens next?' — and this section is where you prove the question was worth asking. The viewer isn't looking for the answer yet, they're looking for confirmation that there WILL be an answer. If you stall here with tangents or extra setup, they lose faith and leave before the payoff. Keep the tension alive by showing progress toward the answer.",
      retentionImpact: `${formatTimeRange(t1, t2)} is where most viewers decide 'this video is or isn't for me.' The opening question ('who wins?', 'is it real?', 'what happens?') needs to feel like it's being actively pursued, not delayed. If the viewer senses you're stalling, they'll skip ahead or swipe away.`,
    },
    {
      time: formatTimeRange(t3, t4),
      action: anchorAction,
      whyItWorked: "By this point, the viewer has committed. They've seen the setup and now they want the payoff. This section delivers movement — new information, reveals, tension, or humor — so the video doesn't stall on one beat. The biggest mistake clones make here is repeating the same type of content from the first two sections. Each section needs to FEEL different from the last. If the middle feels like more of the same intro, the viewer gets bored and clicks off.",
      retentionImpact: `${formatTimeRange(t3, t4)} is where retention spikes or tanks. Mid-video drop-off usually happens because the content plateaued — the viewer feels like they've already seen everything the video has to offer. The solution: introduce something NEW here, not more of the same. A new angle, a new reveal, a new tension point. Make it feel like a second video started.`,
    },
    {
      time: formatTimeRange(t5, durationSec),
      action: endAction,
      whyItWorked: "The ending is where most creators give up. They know the video is wrapping, so they rush to a 'like and subscribe' and fade out. But the best closers do the opposite: they make the ending feel like a reward for staying. They close the question from the hook, deliver one last punchline or reveal, and then ask for engagement as a natural next step — not as a beg. If the viewer feels satisfied, they'll comment, like, and rewatch without being asked.",
      retentionImpact: `${formatTimeRange(t5, durationSec)} is your conversion window. If you've held them this long, you've earned the right to ask for something. But here's the key: ask for engagement that feels like a natural extension of the video (like 'which version should I do next?'), not a generic 'smash that like button.' Comments triggered by a specific question are worth 10x more to the algorithm than a generic 'like and subscribe'.`,
    },
  ];
}

function pickSegment(segments: TimestampSegment[], ratio: number): TimestampSegment {
  if (!segments.length) {
    return { time: "0:00", action: "", whyItWorked: "", retentionImpact: "" };
  }
  const idx = Math.min(segments.length - 1, Math.max(0, Math.floor(ratio * (segments.length - 1))));
  return segments[idx];
}

/** Build 4 phases from timestamp segments — always video-specific. */
export function buildFlowchartFromTimestamps(
  segments: TimestampSegment[],
  videoTitle: string
): FlowchartStep[] {
  if (!segments.length) {
    return [
      {
        step: 1,
        title: "1 · Prove the thumbnail wasn't clickbait",
        detail: `Open "${videoTitle}" at 0:00 and watch the first frame. That frame needs to be the most visually interesting moment from the whole video — the build, the reaction, the reveal. The rest of the section builds on that promise.`,
        color: "emerald",
      },
      {
        step: 2,
        title: "2 · Raise the stakes (why this matters)",
        detail: "After hooking them visually, now tell them why they should care. What's at stake? What's the question this video answers? Keep it tight — one clear sentence that makes the rest of the video feel necessary.",
        color: "blue",
      },
      {
        step: 3,
        title: "3 · Deliver the payoff (prove it)",
        detail: "This is where you deliver what the title and thumbnail promised. The build reveal, the challenge completion, the answer to the question. Don't drag it out — the payoff should be the most satisfying part of the video.",
        color: "purple",
      },
      {
        step: 4,
        title: "4 · What's next (keep them watching)",
        detail: "Don't end with a generic 'subscribe' screen. Tease what's coming in the next video or ask a specific question related to THIS video's topic. Give them a reason to check your channel page, not just hit like and leave.",
        color: "red",
      },
    ];
  }

  const hook = segments[0];
  const loop = pickSegment(segments, 0.28);
  const anchor = pickSegment(segments, 0.55);
  const end = segments[segments.length - 1];

  const phase = (
    step: number,
    title: string,
    seg: TimestampSegment,
    color: string,
    role: string
  ): FlowchartStep => ({
    step,
    title,
    color,
    timestamp: seg.time,
    whatHappens: seg.action,
    whyItWorks: seg.whyItWorked,
    detail: `${role} (${seg.time}): ${seg.action}`,
  });

  return [
    phase(1, "1 · Prove the thumbnail wasn't clickbait", hook, "emerald", "First frame matches the promise"),
    phase(2, "2 · Raise the stakes", loop, "blue", "Why this matters"),
    phase(3, "3 · Deliver the payoff", anchor, "purple", "The proof section"),
    phase(4, "4 · What's next", end, "red", "Tease the follow-up"),
  ];
}

export function mergeFlowchartSteps(
  llmSteps: FlowchartStep[] | undefined,
  segments: TimestampSegment[] | undefined,
  videoTitle: string
): FlowchartStep[] {
  const fromTimestamps = buildFlowchartFromTimestamps(segments || [], videoTitle);
  const titles = ["1 · Prove the thumbnail wasn't clickbait", "2 · Raise the stakes", "3 · Deliver the payoff", "4 · What's next"];
  const colors = ["emerald", "blue", "purple", "red"];

  const llm = llmSteps?.length === 4 ? llmSteps : [];

  return titles.map((title, i) => {
    const fb = fromTimestamps[i];
    const llmStep = llm[i];
    if (!llmStep || isGenericFlowDetail(llmStep.detail)) {
      return fb;
    }
    return {
      step: i + 1,
      title: llmStep.title || title,
      color: llmStep.color || colors[i],
      detail: llmStep.detail,
      whatHappens: llmStep.whatHappens || fb.whatHappens,
      whyItWorks: llmStep.whyItWorks || fb.whyItWorks,
      timestamp: llmStep.timestamp || fb.timestamp,
    };
  });
}

export function ensureTimestampAnalysis(
  segments: TimestampSegment[] | undefined,
  videoTitle: string,
  durationSec: number,
  descriptionSnippet?: string,
  beats: { startSec: number; text: string }[] = []
): TimestampSegment[] {
  const grounded = buildTimestampsFromGrounding(
    videoTitle,
    durationSec,
    descriptionSnippet || "",
    beats
  );

  if (!segments?.length) return grounded;

  const hasSpecific = segments.some((s) => !isGenericTimestampAction(s.action));
  if (!hasSpecific) return grounded;

  return segments.map((s, i) =>
    isGenericTimestampAction(s.action) && grounded[i] ? grounded[i] : s
  );
}
