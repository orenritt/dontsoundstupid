export type KnowledgeEntityType =
  | "company"
  | "person"
  | "concept"
  | "term"
  | "product"
  | "event"
  | "fact";

export type KnowledgeSource =
  | "profile-derived"
  | "industry-scan"
  | "briefing-delivered"
  | "deep-dive"
  | "feedback-implicit"
  | "impress-deep-dive"
  | "calendar-deep-dive"
  | "rapid-fire";

export interface KnowledgeEntity {
  id: string;
  userId: string;
  entityType: KnowledgeEntityType;
  name: string;
  description: string;
  source: KnowledgeSource;
  confidence: number;
  knownSince: string;
  lastReinforced: string;
  embedding: number[] | null;
  embeddingModel: string | null;
  relatedEntityIds: string[];
}

export type KnowledgeRelationship =
  | "works-at"
  | "competes-with"
  | "uses"
  | "researches"
  | "part-of"
  | "related-to"
  | "cares-about";

export interface KnowledgeEdge {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationship: KnowledgeRelationship;
}

export interface PrunedEntity {
  id: string;
  userId: string;
  name: string;
  entityType: KnowledgeEntityType;
  reason: string;
  prunedAt: string;
}

export interface PruneResult {
  pruned: number;
  kept: number;
  exempt: number;
}

export interface ExposureRecord {
  id: string;
  userId: string;
  signalId: string;
  briefingId: string;
  entityIds: string[];
  deliveredAt: string;
  userEngaged: boolean;
}

export type NoveltyFactorName =
  | "entity-overlap"
  | "exposure-history"
  | "temporal-check"
  | "term-novelty-bonus";

export interface NoveltyFactor {
  factor: NoveltyFactorName;
  rawScore: number;
  detail: string;
}

export interface NoveltyScore {
  signalId: string;
  userId: string;
  totalNovelty: number;
  factors: NoveltyFactor[];
  matchedKnownEntities: string[];
  novelElements: string[];
  scoredAt: string;
}

export interface SuggestedExpansion {
  topicArea: string;
  rationale: string;
  filteredSignalCount: number;
}

export interface ZeroBriefingResponse {
  userId: string;
  message: string;
  refinementPrompt: string;
  filteredSignalCount: number;
  suggestedExpansions: SuggestedExpansion[];
  generatedAt: string;
}
