export interface DeepDiveRequest {
  type: "deep-dive";
  briefingItemId: string;
  topic: string;
  category: string;
  timestamp: string;
}

export interface TuneMoreFeedback {
  type: "tune-more";
  briefingItemId: string;
  topic: string;
  category: string;
  comment: string | null;
  timestamp: string;
}

export interface TuneLessFeedback {
  type: "tune-less";
  briefingItemId: string;
  topic: string;
  category: string;
  comment: string | null;
  timestamp: string;
}

export interface NotNovelFeedback {
  type: "not-novel";
  briefingItemId: string;
  topic: string;
  category: string;
  comment: string | null;
  timestamp: string;
}

export type FeedbackSignal =
  | DeepDiveRequest
  | TuneMoreFeedback
  | TuneLessFeedback
  | NotNovelFeedback;

export interface RelevanceAdjustment {
  topic: string;
  category: string;
  weight: number;
  signalCount: number;
  lastUpdated: string;
}

export interface FeedbackHistory {
  signals: FeedbackSignal[];
  learnedAdjustments: RelevanceAdjustment[];
}
