export type ResearchProvider = "perplexity" | "tavily";

export type QueryDerivedFrom =
  | "intelligence-goal"
  | "impress-list"
  | "peer-org"
  | "initiative"
  | "industry"
  | "deep-dive";

export interface QueryTemplate {
  id: string;
  template: string;
  derivedFrom: QueryDerivedFrom;
  provider: ResearchProvider;
}

export interface ResearchQuery {
  id: string;
  queryText: string;
  derivedFrom: QueryDerivedFrom;
  profileReference: string;
  provider: ResearchProvider;
  templateId: string | null;
  contentHash: string;
  createdAt: string;
}

export interface Citation {
  url: string;
  title: string | null;
  snippet: string | null;
}

export interface ResearchResponse {
  id: string;
  queryId: string;
  provider: ResearchProvider;
  content: string;
  citations: Citation[];
  rawResponse: string;
  receivedAt: string;
}
