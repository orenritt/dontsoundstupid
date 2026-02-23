import { z } from "zod";

export type NewsQueryDerivedFrom =
  | "impress-list"
  | "peer-org"
  | "intelligence-goal"
  | "industry"
  | "ai-refresh";

export const newsQueryDerivedFromSchema = z.enum([
  "impress-list",
  "peer-org",
  "intelligence-goal",
  "industry",
  "ai-refresh",
]);

export const newsQuerySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  queryText: z.string(),
  derivedFrom: newsQueryDerivedFromSchema,
  profileReference: z.string(),
  contentHash: z.string(),
  geographicFilters: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});

export const newsPollStateSchema = z.object({
  queryId: z.string().uuid(),
  lastPolledAt: z.string().datetime().nullable(),
  resultCount: z.number().int().min(0),
  consecutiveErrors: z.number().int().min(0),
  lastErrorMessage: z.string().nullable(),
  nextPollAt: z.string().datetime(),
});

export const newsArticleMetadataSchema = z.object({
  sourceDomain: z.string(),
  language: z.string(),
  sentiment: z.number(),
  concepts: z.string().optional(),
});

export interface NewsQuery {
  id: string;
  userId: string;
  queryText: string;
  derivedFrom: NewsQueryDerivedFrom;
  profileReference: string;
  contentHash: string;
  geographicFilters: string[];
  active: boolean;
  createdAt: string;
}

export interface NewsPollState {
  queryId: string;
  lastPolledAt: string | null;
  resultCount: number;
  consecutiveErrors: number;
  lastErrorMessage: string | null;
  nextPollAt: string;
}

export interface NewsArticleMetadata {
  sourceDomain: string;
  language: string;
  sentiment: number;
  concepts?: string;
}

export type ValidatedNewsQuery = z.infer<typeof newsQuerySchema>;
export type ValidatedNewsPollState = z.infer<typeof newsPollStateSchema>;
export type ValidatedNewsArticleMetadata = z.infer<typeof newsArticleMetadataSchema>;
