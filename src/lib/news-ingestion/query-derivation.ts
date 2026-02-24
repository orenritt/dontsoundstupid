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

function buildTopicScope(universe: ContentUniverse): string {
  const top = universe.coreTopics.slice(0, 3);
  if (top.length === 0) return "";
  return `(${top.map((t) => `"${t}"`).join(" OR ")})`;
}

async function loadProfileWithUniverse(userId: string): Promise<{
  profile: Record<string, unknown> | null;
  contentUniverse: ContentUniverse | null;
  geoFilters: string[];
}> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return { profile: null, contentUniverse: null, geoFilters: [] };

  const raw = profile as Record<string, unknown>;
  const contentUniverse = (raw.contentUniverse as ContentUniverse) ?? null;
  const geoRelevance = raw.geographicRelevance;
  const geoFilters = Array.isArray(geoRelevance) ? (geoRelevance as string[]) : [];

  return { profile: raw, contentUniverse, geoFilters };
}

async function deriveFromImpressList(userId: string, universe: ContentUniverse | null): Promise<DerivedQuery[]> {
  const contacts = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));

  const companies = new Set<string>();
  const queries: DerivedQuery[] = [];
  const scope = universe ? buildTopicScope(universe) : "";

  for (const contact of contacts) {
    if (contact.company && !companies.has(contact.company.toLowerCase())) {
      companies.add(contact.company.toLowerCase());
      const base = `"${contact.company}"`;
      queries.push({
        queryText: scope ? `${base} AND ${scope}` : base,
        derivedFrom: "impress-list",
        profileReference: contact.company,
        geographicFilters: [],
      });
    }
  }

  return queries;
}

async function deriveFromPeerOrgs(userId: string, universe: ContentUniverse | null): Promise<DerivedQuery[]> {
  const peers = await db
    .select()
    .from(peerOrganizations)
    .where(and(eq(peerOrganizations.userId, userId), eq(peerOrganizations.confirmed, true)));

  const queries: DerivedQuery[] = [];
  const currentYear = new Date().getFullYear();
  const scope = universe ? buildTopicScope(universe) : "";

  for (const peer of peers) {
    const entityType = peer.entityType || "company";
    let base: string;

    switch (entityType) {
      case "conference":
        base = `"${peer.name}" ${currentYear}`;
        break;
      case "publication":
      case "community":
        base = peer.name;
        break;
      default:
        base = `"${peer.name}"`;
        break;
    }

    queries.push({
      queryText: scope ? `${base} AND ${scope}` : base,
      derivedFrom: "peer-org",
      profileReference: peer.name,
      geographicFilters: [],
    });
  }

  return queries;
}

function deriveFromIntelligenceGoals(profile: Record<string, unknown> | null, universe: ContentUniverse | null): DerivedQuery[] {
  if (!profile) return [];

  const goals = profile.intelligenceGoals;
  if (!Array.isArray(goals)) return [];

  const scope = universe ? buildTopicScope(universe) : "";

  return goals
    .filter((g: { active?: boolean; detail?: string | null }) => g.active && g.detail)
    .map((g: { category?: string; detail?: string }) => {
      const detail = g.detail ?? "";
      return {
        queryText: scope ? `${detail} AND ${scope}` : detail,
        derivedFrom: "intelligence-goal" as const,
        profileReference: `${g.category ?? "custom"}: ${detail}`,
        geographicFilters: [],
      };
    });
}

function deriveFromTopics(profile: Record<string, unknown> | null, universe: ContentUniverse | null): DerivedQuery[] {
  if (!profile) return [];

  if (universe) {
    return universe.coreTopics.map((entry) => ({
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
  const { profile, contentUniverse, geoFilters } = await loadProfileWithUniverse(userId);

  const derived = [
    ...(await deriveFromImpressList(userId, contentUniverse)),
    ...(await deriveFromPeerOrgs(userId, contentUniverse)),
    ...deriveFromIntelligenceGoals(profile, contentUniverse),
    ...deriveFromTopics(profile, contentUniverse),
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
