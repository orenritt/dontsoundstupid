export type FeedType = "rss" | "atom" | "scrape";
export type FeedStatus = "active" | "paused" | "error" | "discovery-pending";

export interface FeedSource {
  id: string;
  url: string;
  domain: string;
  feedType: FeedType;
  status: FeedStatus;
  pollIntervalMinutes: number;
  discoveredAt: string;
}

export interface FeedSubscription {
  id: string;
  feedId: string;
  userId: string;
  reason: string;
  subscribedAt: string;
}

export interface FeedPollState {
  feedId: string;
  lastFetchedAt: string | null;
  lastItemDate: string | null;
  lastContentHash: string | null;
  consecutiveErrors: number;
  lastErrorMessage: string | null;
  nextPollAt: string;
}
