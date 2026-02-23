import { db } from "./db";
import {
  users,
  userProfiles,
  peerOrganizations,
  newsletterRegistry,
  userNewsletterSubscriptions,
} from "./schema";
import { eq, and, sql } from "drizzle-orm";
import { chat } from "./llm";

interface RankedNewsletter {
  newsletterId: string;
  name: string;
  description: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  industryTags: string[];
  why: string;
}

export async function rankNewslettersForUser(
  userId: string
): Promise<RankedNewsletter[]> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!user || !profile) return [];

  const peerOrgs = await db
    .select({ name: peerOrganizations.name })
    .from(peerOrganizations)
    .where(
      and(
        eq(peerOrganizations.userId, userId),
        eq(peerOrganizations.confirmed, true)
      )
    );

  const activeNewsletters = await db
    .select()
    .from(newsletterRegistry)
    .where(eq(newsletterRegistry.status, "active"));

  if (activeNewsletters.length === 0) return [];

  // If registry is too small, skip LLM ranking
  if (activeNewsletters.length < 3) {
    return activeNewsletters.map((n) => ({
      newsletterId: n.id,
      name: n.name,
      description: n.description,
      websiteUrl: n.websiteUrl,
      logoUrl: n.logoUrl,
      industryTags: n.industryTags as string[],
      why: n.description,
    }));
  }

  const userContext = buildUserContext(user, profile, peerOrgs);
  const registryList = activeNewsletters.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    industry_tags: n.industryTags,
  }));

  try {
    const response = await chat(
      [
        {
          role: "system",
          content: `You are a recommendation engine. Given a professional's context and a list of newsletters, rank the newsletters from most specifically relevant to this person down to generally useful.

For each newsletter, provide a short "why" explanation (1 sentence, max 80 chars) that is specific to this user's role and context. The "why" should explain why THIS person would benefit, not just describe the newsletter.

Return valid JSON: an array of objects with {newsletter_id, why}, ordered from most relevant to least relevant. Include all newsletters. If a newsletter has zero relevance, put it last with a generic "why".`,
        },
        {
          role: "user",
          content: `USER PROFILE:\n${userContext}\n\nNEWSLETTER REGISTRY:\n${JSON.stringify(registryList)}`,
        },
      ],
      { model: "gpt-4o-mini", temperature: 0.3 }
    );

    const ranked = JSON.parse(response.content) as {
      newsletter_id: string;
      why: string;
    }[];

    const newsletterMap = new Map(
      activeNewsletters.map((n) => [n.id, n])
    );

    return ranked
      .map((r) => {
        const n = newsletterMap.get(r.newsletter_id);
        if (!n) return null;
        return {
          newsletterId: n.id,
          name: n.name,
          description: n.description,
          websiteUrl: n.websiteUrl,
          logoUrl: n.logoUrl,
          industryTags: n.industryTags as string[],
          why: r.why,
        };
      })
      .filter((r): r is RankedNewsletter => r !== null);
  } catch (err) {
    console.error("Newsletter ranking LLM failed, falling back to popularity:", err);
    return fallbackByPopularity(activeNewsletters);
  }
}

async function fallbackByPopularity(
  newsletters: (typeof newsletterRegistry.$inferSelect)[]
): Promise<RankedNewsletter[]> {
  const counts = await db
    .select({
      newsletterId: userNewsletterSubscriptions.newsletterId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(userNewsletterSubscriptions)
    .groupBy(userNewsletterSubscriptions.newsletterId);

  const countMap = new Map(counts.map((c) => [c.newsletterId, c.count]));

  return newsletters
    .sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0))
    .map((n) => ({
      newsletterId: n.id,
      name: n.name,
      description: n.description,
      websiteUrl: n.websiteUrl,
      logoUrl: n.logoUrl,
      industryTags: n.industryTags as string[],
      why: n.description,
    }));
}

function buildUserContext(
  user: typeof users.$inferSelect,
  profile: typeof userProfiles.$inferSelect,
  peerOrgs: { name: string }[]
): string {
  const parts = [
    `Role: ${user.title || "Professional"} at ${user.company || "their company"}`,
  ];

  const topics = (profile.parsedTopics as string[]) || [];
  const initiatives = (profile.parsedInitiatives as string[]) || [];
  const concerns = (profile.parsedConcerns as string[]) || [];
  const weakAreas = (profile.parsedWeakAreas as string[]) || [];
  const expertAreas = (profile.parsedExpertAreas as string[]) || [];
  const classifications = (
    profile.rapidFireClassifications as {
      topic: string;
      response: string;
    }[]
  ) || [];

  if (topics.length) parts.push(`Topics: ${topics.join(", ")}`);
  if (initiatives.length) parts.push(`Initiatives: ${initiatives.join(", ")}`);
  if (concerns.length) parts.push(`Concerns: ${concerns.join(", ")}`);
  if (weakAreas.length) parts.push(`Wants to learn about: ${weakAreas.join(", ")}`);
  if (expertAreas.length) parts.push(`Expert in: ${expertAreas.join(", ")}`);
  if (peerOrgs.length)
    parts.push(`Peer organizations: ${peerOrgs.map((o) => o.name).join(", ")}`);
  if (classifications.length) {
    const classified = classifications
      .filter((c) => c.response !== "not-relevant")
      .map((c) => `${c.topic} (${c.response})`)
      .join(", ");
    if (classified) parts.push(`Topic familiarity: ${classified}`);
  }

  return parts.join("\n");
}
