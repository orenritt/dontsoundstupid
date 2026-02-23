import { createHash } from "crypto";
import { db } from "../db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
  newsQueries,
} from "../schema";
import { eq, and } from "drizzle-orm";
import type { NewsQueryDerivedFrom } from "../../models/news-ingestion";
import type { ContentUniverse } from "../../models/content-universe";
import { toStringArray } from "../safe-parse";

interface DerivedQuery {
  queryText: string;
  derivedFrom: NewsQueryDerivedFrom;
  profileReference: string;
  geographicFilters: string[];
}

function contentHash(queryText: string): string {
  return createHash("sha256").update(queryText.toLowerCase().trim()).digest("hex");
}

async function getGeographicFilters(userId: string): Promise<string[]> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return [];

  const geoRelevance = (profile as Record<string, unknown>).geographicRelevance;
  if (Array.isArray(geoRelevance)) return geoRelevance as string[];
  return [];
}

async function deriveFromImpressList(userId: string): Promise<DerivedQuery[]> {
  const contacts = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));

  const companies = new Set<string>();
  const queries: DerivedQuery[] = [];

  for (const contact of contacts) {
    if (contact.company && !companies.has(contact.company.toLowerCase())) {
      companies.add(contact.company.toLowerCase());
      queries.push({
        queryText: `"${contact.company}"`,
        derivedFrom: "impress-list",
        profileReference: contact.company,
        geographicFilters: [],
      });
    }
  }

  return queries;
}

async function deriveFromPeerOrgs(userId: string): Promise<DerivedQuery[]> {
  const peers = await db
    .select()
    .from(peerOrganizations)
    .where(and(eq(peerOrganizations.userId, userId), eq(peerOrganizations.confirmed, true)));

  const queries: DerivedQuery[] = [];
  const currentYear = new Date().getFullYear();

  for (const peer of peers) {
    const entityType = peer.entityType || "company";

    switch (entityType) {
      case "conference":
        queries.push({
          queryText: `"${peer.name}" ${currentYear}`,
          derivedFrom: "peer-org",
          profileReference: peer.name,
          geographicFilters: [],
        });
        break;
      case "publication":
      case "community":
        queries.push({
          queryText: peer.name,
          derivedFrom: "peer-org",
          profileReference: peer.name,
          geographicFilters: [],
        });
        break;
      default:
        queries.push({
          queryText: `"${peer.name}"`,
          derivedFrom: "peer-org",
          profileReference: peer.name,
          geographicFilters: [],
        });
        break;
    }
  }

  return queries;
}

async function deriveFromIntelligenceGoals(userId: string): Promise<DerivedQuery[]> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return [];

  const goals = (profile as Record<string, unknown>).intelligenceGoals;
  if (!Array.isArray(goals)) return [];

  return goals
    .filter((g: { active?: boolean; detail?: string | null }) => g.active && g.detail)
    .map((g: { category?: string; detail?: string }) => ({
      queryText: g.detail ?? "",
      derivedFrom: "intelligence-goal" as const,
      profileReference: `${g.category ?? "custom"}: ${g.detail ?? ""}`,
      geographicFilters: [],
    }));
}

async function deriveFromTopics(userId: string): Promise<DerivedQuery[]> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return [];

  const contentUniverse = (profile as Record<string, unknown>).contentUniverse as ContentUniverse | null;

  if (contentUniverse) {
    return contentUniverse.coreTopics.map((entry) => ({
      queryText: `"${entry}"`,
      derivedFrom: "industry" as const,
      profileReference: entry,
      geographicFilters: [],
    }));
  }

  const topics = toStringArray(profile.parsedTopics);
  return topics.map((topic) => ({
    queryText: topic,
    derivedFrom: "industry" as const,
    profileReference: topic,
    geographicFilters: [],
  }));
}

export async function deriveNewsQueries(userId: string): Promise<void> {
  const geoFilters = await getGeographicFilters(userId);

  const derived = [
    ...(await deriveFromImpressList(userId)),
    ...(await deriveFromPeerOrgs(userId)),
    ...(await deriveFromIntelligenceGoals(userId)),
    ...(await deriveFromTopics(userId)),
  ];

  const appliedGeo = derived.map((q) => ({
    ...q,
    geographicFilters: q.geographicFilters.length > 0 ? q.geographicFilters : geoFilters,
  }));

  const seen = new Set<string>();
  const deduped = appliedGeo.filter((q) => {
    const hash = contentHash(q.queryText);
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  const existing = await db
    .select()
    .from(newsQueries)
    .where(eq(newsQueries.userId, userId));

  const existingHashes = new Set(existing.map((e) => e.contentHash));
  const newHashes = new Set(deduped.map((q) => contentHash(q.queryText)));

  for (const query of deduped) {
    const hash = contentHash(query.queryText);
    if (!existingHashes.has(hash)) {
      await db.insert(newsQueries).values({
        userId,
        queryText: query.queryText,
        derivedFrom: query.derivedFrom,
        profileReference: query.profileReference,
        contentHash: hash,
        geographicFilters: query.geographicFilters,
        active: true,
      });
    }
  }

  for (const existingQuery of existing) {
    if (!newHashes.has(existingQuery.contentHash) && existingQuery.active) {
      await db
        .update(newsQueries)
        .set({ active: false })
        .where(eq(newsQueries.id, existingQuery.id));
    }
  }
}

export { contentHash };
