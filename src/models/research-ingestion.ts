export type ResearchSourceType =
  | "semantic-scholar"
  | "arxiv"
  | "pubmed"
  | "preprint";

export type ResearchSourceStatus = "active" | "disabled" | "error";

export interface ResearchSourceApiConfig {
  endpoint: string;
  apiKey: string | null;
  rateLimitPerMinute: number;
  timeoutMs: number;
}

export interface ResearchSource {
  id: string;
  sourceType: ResearchSourceType;
  name: string;
  apiConfig: ResearchSourceApiConfig;
  status: ResearchSourceStatus;
  createdAt: string;
}

export type ResearchQueryDerivedFrom =
  | "intelligence-goal"
  | "industry-topic"
  | "context-keyword"
  | "followed-author";

export interface AcademicResearchQuery {
  id: string;
  userId: string;
  queryText: string;
  derivedFrom: ResearchQueryDerivedFrom;
  profileReference: string;
  sourceType: ResearchSourceType;
  contentHash: string;
  active: boolean;
  createdAt: string;
}

export interface ResearchResult {
  title: string;
  authors: string[];
  abstract: string;
  publicationDate: string;
  citationCount: number;
  doi: string | null;
  sourceApi: ResearchSourceType;
  sourceUrl: string;
  externalId: string;
}

export interface ResearchPollState {
  queryId: string;
  sourceType: ResearchSourceType;
  lastPolledAt: string | null;
  lastQueryHash: string;
  resultCount: number;
  consecutiveErrors: number;
  lastErrorMessage: string | null;
  nextPollAt: string;
}
