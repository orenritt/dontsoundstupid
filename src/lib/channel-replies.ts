import { db } from "./db";
import {
  replySessions,
  inboundReplies,
  briefings,
  feedbackSignals,
  users,
  userProfiles,
} from "./schema";
import { eq, and, desc } from "drizzle-orm";
import { chat } from "./llm";
import { searchPerplexity } from "./ai-research";
import { toStringArray } from "./safe-parse";
import { createLogger } from "./logger";

const log = createLogger("channel-replies");

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const CONFIDENCE_THRESHOLD = 0.6;

type ReplyIntent =
  | "deep-dive"
  | "tune-more"
  | "tune-less"
  | "already-knew"
  | "follow-up"
  | "unrecognized";

interface IntentClassification {
  intent: ReplyIntent;
  itemNumber: number | null;
  confidence: number;
  freeText: string;
}

interface ProcessResult {
  success: boolean;
  responseText: string;
  intent?: ReplyIntent;
  itemNumber?: number | null;
  error?: string;
}

/**
 * Creates a reply session when a briefing is delivered.
 */
export async function createReplySession(
  userId: string,
  briefingId: string,
  channelType: string,
  briefingItems: {
    id: string;
    reason: string;
    reasonLabel: string;
    topic: string;
    content: string;
    sourceUrl: string | null;
    sourceLabel: string | null;
    attribution: string | null;
  }[]
): Promise<string> {
  // Expire any existing active sessions
  await db
    .update(replySessions)
    .set({ active: false })
    .where(
      and(
        eq(replySessions.userId, userId),
        eq(replySessions.active, true)
      )
    );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(replySessions)
    .values({
      userId,
      briefingId,
      channelType,
      briefingItems,
      expiresAt,
    })
    .returning();

  log.info({ userId, briefingId, sessionId: session!.id }, "Reply session created");
  return session!.id;
}

/**
 * Main entry point: processes an inbound reply from any channel.
 */
export async function processInboundReply(
  userId: string,
  messageText: string,
  channelType: string
): Promise<ProcessResult> {
  const ulog = log.child({ userId });

  // Rate limiting
  const recentReplies = await db
    .select({ id: inboundReplies.id })
    .from(inboundReplies)
    .where(
      and(
        eq(inboundReplies.userId, userId),
        eq(inboundReplies.channelType, channelType)
      )
    );

  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  const recentCount = recentReplies.length;
  if (recentCount >= RATE_LIMIT_MAX) {
    return {
      success: false,
      responseText: "You've sent a lot of replies recently. Please wait a bit before sending more.",
      error: "rate_limited",
    };
  }

  // Find active session
  const [session] = await db
    .select()
    .from(replySessions)
    .where(
      and(
        eq(replySessions.userId, userId),
        eq(replySessions.active, true)
      )
    )
    .orderBy(desc(replySessions.createdAt))
    .limit(1);

  if (!session) {
    const reply = await db
      .insert(inboundReplies)
      .values({ userId, channelType, messageText })
      .returning();

    return {
      success: false,
      responseText: "No active briefing session found. Check your latest briefing in the app.",
      error: "no_session",
    };
  }

  if (session.expiresAt < new Date()) {
    await db
      .update(replySessions)
      .set({ active: false })
      .where(eq(replySessions.id, session.id));

    await db
      .insert(inboundReplies)
      .values({ userId, channelType, messageText, sessionId: session.id })
      .returning();

    return {
      success: false,
      responseText: "That briefing has expired. Check your latest briefing for what's new.",
      error: "session_expired",
    };
  }

  // Classify intent
  const classification = await classifyIntent(
    messageText,
    session.briefingItems,
    session.conversationHistory
  );

  ulog.info({
    intent: classification.intent,
    itemNumber: classification.itemNumber,
    confidence: classification.confidence,
  }, "Intent classified");

  // Record the inbound reply
  const [savedReply] = await db
    .insert(inboundReplies)
    .values({
      userId,
      sessionId: session.id,
      channelType,
      messageText,
      classifiedIntent: classification.intent,
      resolvedItemNumber: classification.itemNumber,
      confidence: classification.confidence,
    })
    .returning();

  // Low confidence → ask for clarification
  if (classification.confidence < CONFIDENCE_THRESHOLD) {
    const responseText = "I'm not sure what you mean. You can reply with a number (1-5) to learn more about an item, or say \"more like this\" or \"less of this\" to tune your briefings.";

    await updateReplyResponse(savedReply!.id, responseText);
    await appendToConversation(session.id, messageText, responseText);

    return { success: true, responseText, intent: classification.intent };
  }

  // Route to handler
  let responseText: string;

  switch (classification.intent) {
    case "deep-dive":
      responseText = await handleDeepDive(
        userId,
        session,
        classification.itemNumber
      );
      break;

    case "tune-more":
      responseText = await handleFeedback(
        userId,
        session,
        classification.itemNumber,
        "tune-more"
      );
      break;

    case "tune-less":
      responseText = await handleFeedback(
        userId,
        session,
        classification.itemNumber,
        "tune-less"
      );
      break;

    case "already-knew":
      responseText = await handleFeedback(
        userId,
        session,
        classification.itemNumber,
        "not-novel"
      );
      break;

    case "follow-up":
      responseText = await handleFollowUp(
        userId,
        session,
        messageText,
        classification.itemNumber
      );
      break;

    case "unrecognized":
    default:
      responseText = "Here's what you can do:\n• Reply with a number (1-5) to deep-dive into an item\n• Say \"more like this\" or \"less of this\" to tune\n• Say \"already knew\" to mark something as not new";
      break;
  }

  await updateReplyResponse(savedReply!.id, responseText);
  await appendToConversation(session.id, messageText, responseText);

  return {
    success: true,
    responseText,
    intent: classification.intent,
    itemNumber: classification.itemNumber,
  };
}

async function classifyIntent(
  messageText: string,
  briefingItems: { id: string; topic: string; content: string }[],
  conversationHistory: { role: string; text: string }[]
): Promise<IntentClassification> {
  const itemsList = briefingItems
    .map((item, i) => `${i + 1}. ${item.topic}: ${item.content}`)
    .join("\n");

  const historyContext = conversationHistory.length > 0
    ? `\nPrior conversation:\n${conversationHistory.slice(-4).map((e) => `${e.role}: ${e.text}`).join("\n")}`
    : "";

  const response = await chat(
    [
      {
        role: "system",
        content: `You classify user replies to a daily briefing. Return valid JSON with:
{
  "intent": "deep-dive" | "tune-more" | "tune-less" | "already-knew" | "follow-up" | "unrecognized",
  "itemNumber": <1-5 or null>,
  "confidence": <0.0-1.0>,
  "freeText": "<cleaned version of user's message>"
}

Rules:
- If user says a number alone (e.g. "3"), intent is "deep-dive" with that item number
- "tell me more", "expand on", "what about" → deep-dive
- "more like this", "more of this", "keep sending these" → tune-more
- "less of this", "stop sending", "not interested" → tune-less
- "already knew", "old news", "knew that" → already-knew
- If there's ongoing conversation context and the reply continues it → follow-up
- Match item references by number or by content similarity
- Set confidence based on how clear the intent is`,
      },
      {
        role: "user",
        content: `Briefing items:\n${itemsList}\n${historyContext}\n\nUser reply: "${messageText}"`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.1, maxTokens: 256 }
  );

  try {
    let raw = response.content.trim();
    const fence = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fence?.[1]) raw = fence[1].trim();
    return JSON.parse(raw);
  } catch {
    return {
      intent: "unrecognized",
      itemNumber: null,
      confidence: 0,
      freeText: messageText,
    };
  }
}

async function handleDeepDive(
  userId: string,
  session: typeof replySessions.$inferSelect,
  itemNumber: number | null
): Promise<string> {
  if (!itemNumber || itemNumber < 1 || itemNumber > session.briefingItems.length) {
    return "Which item would you like to know more about? Reply with a number (1-5).";
  }

  const item = session.briefingItems[itemNumber - 1]!;

  // Record feedback
  await db.insert(feedbackSignals).values({
    userId,
    briefingId: session.briefingId,
    briefingItemId: item.id,
    type: "deep-dive",
    topic: item.topic,
  });

  // Try Perplexity first
  if (process.env.PERPLEXITY_API_KEY) {
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

    const role = user?.title || "professional";
    const company = user?.company || "a company";
    const initiatives = profile ? toStringArray(profile.parsedInitiatives) : [];
    const ctx = initiatives.length > 0 ? ` Initiatives: ${initiatives.join(", ")}.` : "";

    const result = await searchPerplexity(
      `Expand on: "${item.topic}". Context: "${item.content}". Deeper analysis, background, implications.`,
      `Research assistant for a ${role} at ${company}.${ctx} Factual, concise.`
    );

    if (result?.content) {
      return `Deep dive on #${itemNumber}:\n\n${result.content}`;
    }
  }

  // Fallback to LLM
  const response = await chat(
    [
      {
        role: "system",
        content: "3-4 sentence deeper explanation. Factual, dry tone, no fluff. Include context, numbers, or implications.",
      },
      {
        role: "user",
        content: `Expand on: "${item.topic}". Original: "${item.content}"`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.5 }
  );

  return `Deep dive on #${itemNumber}:\n\n${response.content}`;
}

async function handleFeedback(
  userId: string,
  session: typeof replySessions.$inferSelect,
  itemNumber: number | null,
  type: string
): Promise<string> {
  if (!itemNumber || itemNumber < 1 || itemNumber > session.briefingItems.length) {
    return `Which item? Reply with a number (1-5).`;
  }

  const item = session.briefingItems[itemNumber - 1]!;

  await db.insert(feedbackSignals).values({
    userId,
    briefingId: session.briefingId,
    briefingItemId: item.id,
    type,
    topic: item.topic,
  });

  const messages: Record<string, string> = {
    "tune-more": `Got it — more like #${itemNumber}. I'll prioritize similar content.`,
    "tune-less": `Noted — dialing back on content like #${itemNumber}.`,
    "not-novel": `Marked #${itemNumber} as already known. I'll raise the bar for similar topics.`,
  };

  return messages[type] || "Feedback recorded, thanks.";
}

async function handleFollowUp(
  userId: string,
  session: typeof replySessions.$inferSelect,
  messageText: string,
  itemNumber: number | null
): Promise<string> {
  const item = itemNumber && itemNumber >= 1 && itemNumber <= session.briefingItems.length
    ? session.briefingItems[itemNumber - 1]
    : null;

  const priorContext = session.conversationHistory
    .slice(-4)
    .map((e) => `${e.role}: ${e.text}`)
    .join("\n");

  const response = await chat(
    [
      {
        role: "system",
        content: "You are a briefing assistant. Answer follow-up questions concisely based on the context. If you don't know, say so honestly.",
      },
      {
        role: "user",
        content: `${item ? `About item: "${item.topic}" — ${item.content}\n\n` : ""}Prior conversation:\n${priorContext}\n\nFollow-up: "${messageText}"`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.5 }
  );

  return response.content;
}

async function updateReplyResponse(replyId: string, responseText: string) {
  await db
    .update(inboundReplies)
    .set({ responseText, processedAt: new Date() })
    .where(eq(inboundReplies.id, replyId));
}

async function appendToConversation(
  sessionId: string,
  userText: string,
  systemText: string
) {
  const [session] = await db
    .select({ conversationHistory: replySessions.conversationHistory })
    .from(replySessions)
    .where(eq(replySessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const now = new Date().toISOString();
  const history = [...(session.conversationHistory || [])];
  history.push({ role: "user" as const, text: userText, timestamp: now });
  history.push({ role: "system" as const, text: systemText, timestamp: now });

  // Keep last 20 entries
  const trimmed = history.slice(-20);

  await db
    .update(replySessions)
    .set({ conversationHistory: trimmed })
    .where(eq(replySessions.id, sessionId));
}
