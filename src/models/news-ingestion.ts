import { z } from "zod";

export type NewsQueryDerivedFrom =
  | "impress-list"
  | "peer-org"
  | "intelligence-goal"
  | "industry";

export const newsQueryDerivedFromSchema = z.enum([
  "impress-list",
  "peer-org",
  "intelligence-goal",
  "industry",
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
  gdeltDocId: z.string(),
  sourceDomain: z.string(),
  sourceCountry: z.string(),
  language: z.string(),
  tonePositive: z.number(),
  toneNegative: z.number(),
  tonePolarity: z.number(),
  toneActivity: z.number(),
  toneSelfReference: z.number(),
  gkgSource: z.boolean(),
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
  gdeltDocId: string;
  sourceDomain: string;
  sourceCountry: string;
  language: string;
  tonePositive: number;
  toneNegative: number;
  tonePolarity: number;
  toneActivity: number;
  toneSelfReference: number;
  gkgSource: boolean;
}

export type ValidatedNewsQuery = z.infer<typeof newsQuerySchema>;
export type ValidatedNewsPollState = z.infer<typeof newsPollStateSchema>;
export type ValidatedNewsArticleMetadata = z.infer<typeof newsArticleMetadataSchema>;
