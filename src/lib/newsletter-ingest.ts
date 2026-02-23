import { db } from "./db";
import {
  newsletterRegistry,
  userNewsletterSubscriptions,
} from "./schema";
import { eq, sql } from "drizzle-orm";
import { chat } from "./llm";
import { htmlToText } from "./email-forward";
import crypto from "crypto";

interface InboundNewsletterEmail {
  from: string;
  to: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: string;
}

interface ExtractedStory {
  title: string;
  summary: string;
  source_url: string | null;
  source_label: string | null;
}

interface ProcessResult {
  newsletterId: string | null;
  storiesExtracted: number;
  signalsCreated: number;
  error?: string;
}

export async function processNewsletterEmail(
  email: InboundNewsletterEmail
): Promise<ProcessResult> {
  const recipientAddress = extractRecipientAddress(email.to);
  if (!recipientAddress) {
    console.log(`Newsletter ingest: could not parse recipient from "${email.to}"`);
    return { newsletterId: null, storiesExtracted: 0, signalsCreated: 0, error: "invalid-recipient" };
  }

  const [newsletter] = await db
    .select()
    .from(newsletterRegistry)
    .where(eq(newsletterRegistry.systemEmailAddress, recipientAddress))
    .limit(1);

  if (!newsletter) {
    console.log(`Newsletter ingest: unknown recipient ${recipientAddress}`);
    return { newsletterId: null, storiesExtracted: 0, signalsCreated: 0, error: "unknown-recipient" };
  }

  if (newsletter.status !== "active") {
    console.log(`Newsletter ingest: inactive newsletter ${newsletter.name} (${newsletter.status})`);
    return { newsletterId: newsletter.id, storiesExtracted: 0, signalsCreated: 0, error: "inactive-newsletter" };
  }

  const body = extractBody(email);
  if (!body.trim()) {
    console.log(`Newsletter ingest: empty body for ${newsletter.name}`);
    return { newsletterId: newsletter.id, storiesExtracted: 0, signalsCreated: 0, error: "empty-body" };
  }

  const stories = await extractStories(body, newsletter.name);
  if (stories.length === 0) {
    console.log(`Newsletter ingest: zero stories extracted from ${newsletter.name}`);
    return { newsletterId: newsletter.id, storiesExtracted: 0, signalsCreated: 0 };
  }

  const subscribers = await db
    .select({ userId: userNewsletterSubscriptions.userId })
    .from(userNewsletterSubscriptions)
    .where(eq(userNewsletterSubscriptions.newsletterId, newsletter.id));

  let signalsCreated = 0;

  for (const story of stories) {
    const sourceUrl =
      story.source_url ||
      `newsletter://${newsletter.id}/${crypto.randomUUID()}`;

    const signalResult = await db.execute(sql`
      INSERT INTO signals (layer, source_url, title, content, summary, metadata, published_at)
      VALUES (
        'newsletter',
        ${sourceUrl},
        ${story.title},
        ${story.summary},
        ${story.summary.substring(0, 500)},
        ${JSON.stringify({
          newsletter_registry_id: newsletter.id,
          newsletter_name: newsletter.name,
          source_label: story.source_label,
          extracted_at: new Date().toISOString(),
        })}::jsonb,
        NOW()
      )
      ON CONFLICT (source_url) DO NOTHING
      RETURNING id
    `);

    const rows = signalResult as unknown as { id: string }[];
    const signalId = rows[0]?.id;
    if (!signalId) continue;

    signalsCreated++;

    for (const sub of subscribers) {
      await db.execute(sql`
        INSERT INTO signal_provenance (signal_id, user_id, trigger_reason, profile_reference)
        VALUES (
          ${signalId},
          ${sub.userId},
          'newsletter-subscription',
          ${newsletter.name}
        )
        ON CONFLICT (signal_id, user_id, trigger_reason, profile_reference) DO NOTHING
      `);
    }
  }

  await db
    .update(newsletterRegistry)
    .set({ lastEmailReceivedAt: new Date() })
    .where(eq(newsletterRegistry.id, newsletter.id));

  console.log(
    `Newsletter ingest: ${newsletter.name} → ${stories.length} stories extracted, ${signalsCreated} signals created, ${subscribers.length} subscribers`
  );

  return {
    newsletterId: newsletter.id,
    storiesExtracted: stories.length,
    signalsCreated,
  };
}

async function extractStories(
  body: string,
  newsletterName: string
): Promise<ExtractedStory[]> {
  const truncated = body.substring(0, 12000);

  const response = await chat(
    [
      {
        role: "system",
        content: `You extract individual stories from newsletter content. Given the text body of a newsletter, identify each distinct story, news item, or piece of intelligence.

For each story, return:
- title: short headline (max 100 chars)
- summary: 1-2 sentence factual description
- source_url: URL referenced for that story if one exists, otherwise null
- source_label: publication name if identifiable, otherwise null

Return valid JSON: an array of story objects. If the newsletter is purely promotional, a subscription confirmation, or contains no extractable stories, return an empty array.`,
      },
      {
        role: "user",
        content: `Newsletter: ${newsletterName}\n\n${truncated}`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.3 }
  );

  try {
    const parsed = JSON.parse(response.content);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: ExtractedStory) => s.title && s.summary
    );
  } catch {
    console.error(`Newsletter ingest: failed to parse LLM response for ${newsletterName}`);
    return [];
  }
}

function extractBody(email: InboundNewsletterEmail): string {
  if (email.htmlBody) {
    return htmlToText(email.htmlBody);
  }
  return email.textBody || "";
}

function extractRecipientAddress(to: string): string | null {
  const emailMatch = to.match(/<([^>]+)>/);
  const address = (emailMatch ? emailMatch[1] : to).toLowerCase().trim();
  return address || null;
}
