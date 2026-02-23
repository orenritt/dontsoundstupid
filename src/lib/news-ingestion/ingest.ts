import { createHash } from "crypto";
import { db } from "../db";
import { newsQueries, newsPollState } from "../schema";
import { eq, and, lte } from "drizzle-orm";
import { GdeltDocClient, type GdeltArticle } from "./gdelt-doc-client";
import { GdeltGkgClient, type GkgEntityMention } from "./gdelt-gkg-client";
import { type NewsIngestionConfig, loadNewsIngestionConfig } from "./config";
import type { NewsQueryDerivedFrom } from "../../models/news-ingestion";

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

function derivedFromToTriggerReason(derivedFrom: NewsQueryDerivedFrom): string {
  switch (derivedFrom) {
    case "impress-list":
      return "impress-list";
    case "peer-org":
      return "peer-org";
    case "intelligence-goal":
      return "intelligence-goal";
    case "industry":
      return "industry-scan";
  }
}

function articleContentHash(article: GdeltArticle): string {
  return createHash("sha256")
    .update(`${article.url}:${article.title}`)
    .digest("hex");
}

function articleToSignal(article: GdeltArticle): IngestedSignal {
  return {
    layer: "news",
    sourceUrl: article.url,
    title: article.title,
    content: article.title,
    summary: article.title,
    metadata: {
      gdelt_doc_id: article.gdeltDocId,
      source_domain: article.domain,
      source_country: article.sourcecountry,
      language: article.language,
      tone_positive: String(article.tonePositive),
      tone_negative: String(article.toneNegative),
      tone_polarity: String(article.tonePolarity),
      tone_activity: String(article.toneActivity),
      tone_self_reference: String(article.toneSelfReference),
    },
    publishedAt: article.seendate
      ? new Date(article.seendate).toISOString()
      : new Date().toISOString(),
  };
}

function gkgMentionToSignal(mention: GkgEntityMention): IngestedSignal {
  return {
    layer: "news",
    sourceUrl: mention.url,
    title: mention.title,
    content: mention.title,
    summary: mention.title,
    metadata: {
      source_domain: mention.sourceDomain,
      source_country: mention.sourceCountry,
      language: mention.language,
      tone_polarity: String(mention.tone),
      gkg_source: "true",
      gkg_entity_name: mention.entityName,
      gkg_entity_type: mention.entityType,
    },
    publishedAt: mention.seendate
      ? new Date(mention.seendate).toISOString()
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
  const docClient = new GdeltDocClient(config);
  const gkgClient = new GdeltGkgClient();
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
      if (docClient.isRateLimited()) break;

      const geoFilters = (query.geographicFilters as string[]) ?? [];
      const result = await docClient.searchArticles(
        query.queryText,
        geoFilters.length > 0 ? geoFilters : undefined
      );

      let newCount = 0;
      for (const article of result.articles) {
        if (seenUrls.has(article.url)) continue;
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

  // GKG supplementary lookup
  if (config.gkgEnabled) {
    const orgQueries = capped.filter((q) => q.derivedFrom === "impress-list" || q.derivedFrom === "peer-org");
    for (const query of orgQueries.slice(0, 10)) {
      try {
        const mentions = await gkgClient.lookupOrganization(query.profileReference);
        for (const mention of mentions) {
          if (seenUrls.has(mention.url)) continue;
          seenUrls.add(mention.url);

          allSignals.push(gkgMentionToSignal(mention));
          allProvenance.push({
            signalSourceUrl: mention.url,
            userId: query.userId,
            triggerReason: derivedFromToTriggerReason(query.derivedFrom as NewsQueryDerivedFrom),
            profileReference: query.profileReference,
          });
        }
      } catch {
        // GKG lookups are supplementary — don't fail the cycle
      }
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
