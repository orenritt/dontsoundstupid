import { db } from "./db";
import { users } from "./schema";
import { eq, sql } from "drizzle-orm";
import type {
  InboundEmail,
  ParsedForward,
  UrlEnrichment,
  EmailForwardConfig,
  EmailForwardSignalMetadata,
} from "../models/email-forward";
import { DEFAULT_EMAIL_FORWARD_CONFIG } from "../models/email-forward";

const FORWARD_BOUNDARY_PATTERNS = [
  /^-{5,}\s*Forwarded message\s*-{5,}/im,
  /^Begin forwarded message:/im,
  /^-{3,}\s*Original Message\s*-{3,}/im,
  /^From:\s+.+\nSent:\s+/im,
  /^From:\s+.+\nDate:\s+/im,
  /^On .+ wrote:$/im,
  /^>{2,}\s*From:/im,
];

const INFRASTRUCTURE_URL_PATTERNS = [
  /unsubscribe/i,
  /optout/i,
  /opt-out/i,
  /manage[-_]?preferences/i,
  /email[-_]?preferences/i,
  /list[-_]?unsubscribe/i,
  /mailto:/i,
  /tracking\./i,
  /click\./i,
  /t\.co\//i,
];

const URL_REGEX = /https?:\/\/[^\s<>"')\]},]+/gi;

// --- Webhook Signature Verification ---

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  config: EmailForwardConfig = DEFAULT_EMAIL_FORWARD_CONFIG
): boolean {
  if (!config.webhookSecret) return false;

  const crypto = require("crypto") as typeof import("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// --- Sender Identification ---

export async function lookupUserByEmail(
  senderEmail: string
): Promise<{ id: string; email: string } | null> {
  const normalized = senderEmail.toLowerCase().trim();
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  return user ?? null;
}

// --- Rate Limiting ---

export async function checkRateLimit(
  userId: string,
  config: EmailForwardConfig = DEFAULT_EMAIL_FORWARD_CONFIG
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM email_forwards
    WHERE user_id = ${userId}
      AND received_at >= NOW() - INTERVAL '24 hours'
  `);

  const rows = result as unknown as { count: string }[];
  const count = Number(rows[0]?.count ?? 0);
  return count < config.maxForwardsPerUserPerDay;
}

// --- Forward Content Parsing ---

export function parseForwardedEmail(email: InboundEmail): ParsedForward {
  const body = extractTextFromEmail(email);

  if (!body.trim()) {
    return {
      userAnnotation: null,
      forwardedContent: "",
      originalSender: null,
      subject: email.subject,
      extractedUrls: [],
      primaryUrl: null,
    };
  }

  const { annotation, content } = splitAtForwardBoundary(body);
  const originalSender = extractOriginalSender(content || body);
  const extractedUrls = extractUrls(content || body);
  const primaryUrl = identifyPrimaryUrl(extractedUrls);

  return {
    userAnnotation: annotation || null,
    forwardedContent: content || body,
    originalSender,
    subject: email.subject,
    extractedUrls,
    primaryUrl,
  };
}

function extractTextFromEmail(email: InboundEmail): string {
  if (email.textBody?.trim()) {
    return email.textBody;
  }

  if (email.htmlBody) {
    return htmlToText(email.htmlBody);
  }

  return "";
}

export function htmlToText(html: string): string {
  let text = html;

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "- ");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");

  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)");

  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  text = text.replace(/<[^>]+>/g, "");

  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");

  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

function splitAtForwardBoundary(
  body: string
): { annotation: string | null; content: string | null } {
  for (const pattern of FORWARD_BOUNDARY_PATTERNS) {
    const match = pattern.exec(body);
    if (match && match.index !== undefined) {
      const annotation = body.substring(0, match.index).trim();
      const content = body.substring(match.index).trim();
      return {
        annotation: annotation || null,
        content: content || null,
      };
    }
  }

  return { annotation: null, content: null };
}

function extractOriginalSender(content: string): string | null {
  const fromMatch = content.match(/^From:\s*(.+?)(?:\n|$)/im);
  if (fromMatch) {
    const sender = fromMatch[1].trim();
    const emailMatch = sender.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : sender;
  }
  return null;
}

// --- URL Extraction and Enrichment ---

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) || [];
  const uniqueUrls = [...new Set(matches.map((url) => url.replace(/[.,;:!?)]+$/, "")))];
  return uniqueUrls;
}

export function identifyPrimaryUrl(urls: string[]): string | null {
  const substantiveUrls = urls.filter(
    (url) => !INFRASTRUCTURE_URL_PATTERNS.some((pattern) => pattern.test(url))
  );
  return substantiveUrls[0] ?? null;
}

export async function enrichUrl(
  url: string,
  timeoutMs: number = DEFAULT_EMAIL_FORWARD_CONFIG.urlEnrichmentTimeoutMs
): Promise<UrlEnrichment> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DontSoundStupid/1.0 (content enrichment)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { url, title: null, description: null, fetchedAt: new Date().toISOString() };
    }

    const html = await response.text();
    const title = extractMetaTag(html, "title") || extractHtmlTitle(html);
    const description = extractMetaTag(html, "description");

    return {
      url,
      title: title ? title.substring(0, 500) : null,
      description: description ? description.substring(0, 1000) : null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { url, title: null, description: null, fetchedAt: new Date().toISOString() };
  }
}

function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaTag(html: string, name: string): string | null {
  const ogPattern = new RegExp(
    `<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const ogMatch = html.match(ogPattern);
  if (ogMatch) return ogMatch[1];

  const ogPatternReversed = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`,
    "i"
  );
  const ogMatchReversed = html.match(ogPatternReversed);
  if (ogMatchReversed) return ogMatchReversed[1];

  const metaPattern = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const metaMatch = html.match(metaPattern);
  if (metaMatch) return metaMatch[1];

  const metaPatternReversed = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
    "i"
  );
  const metaMatchReversed = html.match(metaPatternReversed);
  if (metaMatchReversed) return metaMatchReversed[1];

  return null;
}

// --- Signal Creation ---

export async function createEmailForwardSignal(
  userId: string,
  parsed: ParsedForward,
  enrichment: UrlEnrichment | null
): Promise<string | null> {
  const title =
    enrichment?.title ||
    parsed.subject ||
    parsed.forwardedContent.substring(0, 100);

  const metadata: EmailForwardSignalMetadata = {
    userAnnotation: parsed.userAnnotation,
    originalSender: parsed.originalSender,
    forwardedAt: new Date().toISOString(),
    extractedUrls: parsed.extractedUrls,
    primaryUrlTitle: enrichment?.title ?? null,
    primaryUrlDescription: enrichment?.description ?? null,
  };

  const metadataRecord: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      metadataRecord[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }

  const sourceUrl = parsed.primaryUrl || `email-forward://${userId}/${Date.now()}`;

  const signalResult = await db.execute(sql`
    INSERT INTO signals (layer, source_url, title, content, summary, metadata, published_at)
    VALUES (
      'email-forward',
      ${sourceUrl},
      ${title},
      ${parsed.forwardedContent},
      ${parsed.forwardedContent.substring(0, 500)},
      ${JSON.stringify(metadataRecord)}::jsonb,
      NOW()
    )
    ON CONFLICT (source_url) DO NOTHING
    RETURNING id
  `);

  const signalRows = signalResult as unknown as { id: string }[];
  const signalId = signalRows[0]?.id;
  if (!signalId) return null;

  await db.execute(sql`
    INSERT INTO signal_provenance (signal_id, user_id, trigger_reason, profile_reference)
    VALUES (
      ${signalId},
      ${userId},
      'user-curated',
      ${parsed.userAnnotation || "email-forward"}
    )
  `);

  await db.execute(sql`
    INSERT INTO email_forwards (user_id, sender_email, subject, user_annotation, forwarded_content, original_sender, extracted_urls, primary_url, signal_id)
    VALUES (
      ${userId},
      ${userId},
      ${parsed.subject},
      ${parsed.userAnnotation},
      ${parsed.forwardedContent},
      ${parsed.originalSender},
      ${sql`ARRAY[${sql.join(parsed.extractedUrls.map(u => sql`${u}`), sql`, `)}]::TEXT[]`},
      ${parsed.primaryUrl},
      ${signalId}
    )
  `);

  return signalId;
}

// --- Main Processing Pipeline ---

export async function processInboundEmail(
  email: InboundEmail,
  config: EmailForwardConfig = DEFAULT_EMAIL_FORWARD_CONFIG
): Promise<{ signalId: string | null; error?: string }> {
  const user = await lookupUserByEmail(email.from);
  if (!user) {
    console.log(`Email forward: unrecognized sender ${email.from}`);
    return { signalId: null, error: "unrecognized-sender" };
  }

  const withinLimit = await checkRateLimit(user.id, config);
  if (!withinLimit) {
    console.log(`Email forward: rate limit exceeded for user ${user.id}`);
    return { signalId: null, error: "rate-limit-exceeded" };
  }

  const parsed = parseForwardedEmail(email);

  if (!parsed.forwardedContent.trim() && parsed.extractedUrls.length === 0) {
    console.log(`Email forward: empty body with no URLs from user ${user.id}`);
    return { signalId: null, error: "empty-content" };
  }

  let enrichment: UrlEnrichment | null = null;
  if (parsed.primaryUrl) {
    enrichment = await enrichUrl(parsed.primaryUrl, config.urlEnrichmentTimeoutMs);
  }

  const signalId = await createEmailForwardSignal(user.id, parsed, enrichment);
  return { signalId };
}
