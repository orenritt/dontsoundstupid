import { db } from "../db";
import { newsQueries, newsPollState, signals, signalProvenance } from "../schema";
import { eq, lte } from "drizzle-orm";
import { NewsApiAiClient, type NewsApiArticle } from "./newsapi-client";
import { loadNewsIngestionConfig } from "./config";
import type { NewsQueryDerivedFrom } from "../../models/news-ingestion";
import type { TriggerReason } from "../../models/signal";

interface IngestedSignal {
  layer: "news";
  sourceUrl: string;
  title: string;
  content: string;
  summary: string;
  metadata: Record<string, string>;
  publishedAt: string;
}

interface ProvenanceRecord {
  signalSourceUrl: string;
  userId: string;
  triggerReason: string;
  profileReference: string;
}

interface IngestionResult {
  signals: IngestedSignal[];
  provenance: ProvenanceRecord[];
  queriesPolled: number;
  articlesFound: number;
  errorsEncounted: number;
}

function derivedFromToTriggerReason(derivedFrom: NewsQueryDerivedFrom): TriggerReason {
  switch (derivedFrom) {
    case "impress-list":
      return "impress-list";
    case "peer-org":
      return "peer-org";
    case "intelligence-goal":
      return "intelligence-goal";
    case "industry":
      return "industry-scan";
    case "ai-refresh":
      return "ai-discovery";
  }
}

function truncateBody(body: string, maxLen = 500): string {
  if (body.length <= maxLen) return body;
  return body.slice(0, maxLen).trimEnd() + "...";
}

function articleToSignal(article: NewsApiArticle): IngestedSignal {
  const sourceDomain = article.source.uri || "";
  const concepts = article.concepts
    .filter((c) => c.label.eng)
    .slice(0, 5)
    .map((c) => c.label.eng);

  return {
    layer: "news",
    sourceUrl: article.url,
    title: article.title,
    content: truncateBody(article.body),
    summary: truncateBody(article.body, 300),
    metadata: {
      source_domain: sourceDomain,
      language: article.lang,
      sentiment: String(article.sentiment ?? 0),
      ...(concepts.length > 0 ? { concepts: concepts.join(", ") } : {}),
    },
    publishedAt: article.dateTimePub
      ? new Date(article.dateTimePub).toISOString()
      : new Date().toISOString(),
  };
}

async function ensurePollState(queryId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(newsPollState)
    .where(eq(newsPollState.queryId, queryId))
    .limit(1);

  if (!existing) {
    await db.insert(newsPollState).values({
      queryId,
      resultCount: 0,
      consecutiveErrors: 0,
      nextPollAt: new Date(),
    });
  }
}

async function updatePollStateSuccess(queryId: string, resultCount: number): Promise<void> {
  const config = loadNewsIngestionConfig();
  const nextPoll = new Date(Date.now() + config.pollIntervalMinutes * 60 * 1000);

  await db
    .update(newsPollState)
    .set({
      lastPolledAt: new Date(),
      resultCount,
      consecutiveErrors: 0,
      lastErrorMessage: null,
      nextPollAt: nextPoll,
    })
    .where(eq(newsPollState.queryId, queryId));
}

async function updatePollStateError(queryId: string, errorMessage: string): Promise<void> {
  const [current] = await db
    .select()
    .from(newsPollState)
    .where(eq(newsPollState.queryId, queryId))
    .limit(1);

  const errors = (current?.consecutiveErrors ?? 0) + 1;
  const backoffMs = Math.min(errors * errors * 60 * 1000, 24 * 60 * 60 * 1000);
  const nextPoll = new Date(Date.now() + backoffMs);

  await db
    .update(newsPollState)
    .set({
      consecutiveErrors: errors,
      lastErrorMessage: errorMessage,
      nextPollAt: nextPoll,
    })
    .where(eq(newsPollState.queryId, queryId));
}

export async function pollNewsQueries(cycleId: string): Promise<IngestionResult> {
  const config = loadNewsIngestionConfig();
  const client = new NewsApiAiClient({
    maxResults: config.maxArticlesPerQuery,
    lookbackHours: config.lookbackHours,
  });
  const now = new Date();

  const activeQueries = await db
    .select()
    .from(newsQueries)
    .where(eq(newsQueries.active, true));

  const duePollStates = await db
    .select()
    .from(newsPollState)
    .where(lte(newsPollState.nextPollAt, now));

  const dueQueryIds = new Set(duePollStates.map((p) => p.queryId));

  const queriesToPoll = activeQueries.filter((q) => {
    return dueQueryIds.has(q.id) || !duePollStates.some((p) => p.queryId === q.id);
  });

  const capped = queriesToPoll.slice(0, config.maxQueriesPerCycle);

  const allSignals: IngestedSignal[] = [];
  const allProvenance: ProvenanceRecord[] = [];
  const seenUrls = new Set<string>();
  let totalArticles = 0;
  let totalErrors = 0;

  for (const query of capped) {
    await ensurePollState(query.id);

    try {
      const result = await client.searchArticles(query.queryText);

      let newCount = 0;
      for (const article of result.articles) {
        if (!article.url || seenUrls.has(article.url)) continue;
        seenUrls.add(article.url);

        allSignals.push(articleToSignal(article));
        allProvenance.push({
          signalSourceUrl: article.url,
          userId: query.userId,
          triggerReason: derivedFromToTriggerReason(query.derivedFrom as NewsQueryDerivedFrom),
          profileReference: query.profileReference,
        });
        newCount++;
      }

      totalArticles += result.articles.length;
      await updatePollStateSuccess(query.id, newCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updatePollStateError(query.id, message);
      totalErrors++;
    }
  }

  // Persist signals and provenance to database
  for (const signal of allSignals) {
    try {
      const [inserted] = await db
        .insert(signals)
        .values({
          layer: "news",
          sourceUrl: signal.sourceUrl,
          title: signal.title,
          content: signal.content,
          summary: signal.summary,
          metadata: signal.metadata,
          publishedAt: new Date(signal.publishedAt),
        })
        .onConflictDoNothing()
        .returning({ id: signals.id });

      if (!inserted) continue;

      const matching = allProvenance.filter((p) => p.signalSourceUrl === signal.sourceUrl);
      for (const prov of matching) {
        await db
          .insert(signalProvenance)
          .values({
            signalId: inserted.id,
            userId: prov.userId,
            triggerReason: prov.triggerReason as TriggerReason,
            profileReference: prov.profileReference,
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      console.error("Failed to persist news signal:", err);
    }
  }

  return {
    signals: allSignals,
    provenance: allProvenance,
    queriesPolled: capped.length,
    articlesFound: totalArticles,
    errorsEncounted: totalErrors,
  };
}
