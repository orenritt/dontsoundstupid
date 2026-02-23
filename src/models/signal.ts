export type SignalLayer =
  | "syndication"
  | "research"
  | "narrative"
  | "events"
  | "personal-graph"
  | "ai-research"
  | "email-forward"
  | "news"
  | "newsletter";

export interface Signal {
  id: string;
  layer: SignalLayer;
  sourceUrl: string;
  title: string;
  content: string;
  summary: string;
  metadata: Record<string, string>;
  embedding: number[] | null;
  embeddingModel: string | null;
  publishedAt: string;
  ingestedAt: string;
}

export interface SignalDedup {
  signalId: string;
  duplicateOfId: string;
  similarity: number;
  detectedAt: string;
}

export type TriggerReason =
  | "followed-org"
  | "peer-org"
  | "impress-list"
  | "intelligence-goal"
  | "industry-scan"
  | "personal-graph"
  | "user-curated"
  | "newsletter-subscription"
  | "ai-discovery";

export interface SignalProvenance {
  id: string;
  signalId: string;
  userId: string;
  triggerReason: TriggerReason;
  profileReference: string;
  createdAt: string;
}

export interface SignalQuery {
  dateFrom?: string;
  dateTo?: string;
  layers?: SignalLayer[];
  metadataFilters?: Record<string, string>;
  embeddingVector?: number[];
  similarityThreshold?: number;
  limit?: number;
}

export interface ScoredSignal {
  signal: Signal;
  relevanceScore: number;
  matchedKeywords: string[];
  contributingLayers: SignalLayer[];
}
