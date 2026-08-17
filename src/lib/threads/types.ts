export interface ThreadsRawPost {
  id: string;
  code?: string;
  urlPath?: string;
  username?: string;
  text?: string;
  takenAt?: number;
  likeCount?: number;
  replyCount?: number;
  url?: string;
  flair?: string;
}

export type ThreadsSource = "ssr" | "diy" | "apify" | "reddit";

export interface ThreadsLead {
  postId: string;
  postUrl: string;
  username: string;
  text: string;
  category: string;
  intentScore: number;
  takenAt: number;
  foundAt: number;
  source: ThreadsSource;
  matchedKeyword: string;
  replyDrafts: string[];
  fiverrGig?: string;
  status: "queued" | "approved" | "skipped" | "failed";
  replyCount?: number;
  replyId?: string;
  repliedAt?: number;
  error?: string;
}

export interface ThreadsAuth {
  accessToken: string;
  userId: string;
  expiresAt: number;
  username?: string;
}

export interface ThreadsMonitorState {
  keywordCursor: number;
  consecutiveFailures: number;
  lastPollAt: number;
  lastError?: string;
  lastEmailAt: number;
  lastEmailCount: number;
  tokenWarningSent: boolean;
  /** UTC ms until which polling stays paused (recovery mode). Survives restarts. */
  recoveryUntil?: number;
}

export interface ThreadsCategory {
  id: string;
  label: string;
  fiverrTag: string;
  keywords: string[];
}
