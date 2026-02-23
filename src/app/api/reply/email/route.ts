import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { processInboundReply } from "@/lib/channel-replies";
import { createLogger } from "@/lib/logger";

const log = createLogger("reply-email-webhook");

/**
 * Inbound email webhook for processing briefing replies.
 * Supports SendGrid Inbound Parse and generic JSON webhooks.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");
    if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let senderEmail: string;
  let messageBody: string;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // SendGrid Inbound Parse format
    const formData = await request.formData();
    senderEmail = extractEmail(formData.get("from") as string || "");
    messageBody = stripQuotedContent(
      (formData.get("text") as string) || (formData.get("html") as string) || ""
    );
  } else {
    // Generic JSON webhook
    const body = await request.json();
    senderEmail = extractEmail(body.from || body.sender || body.from_email || "");
    messageBody = stripQuotedContent(body.text || body.body || body.plain || "");
  }

  if (!senderEmail || !messageBody.trim()) {
    log.warn({ senderEmail: senderEmail || "none" }, "Empty or unparseable inbound email");
    return NextResponse.json({ error: "Missing sender or body" }, { status: 400 });
  }

  // Identify user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, senderEmail.toLowerCase()))
    .limit(1);

  if (!user) {
    log.info({ senderEmail }, "Inbound reply from unknown sender — discarding");
    return NextResponse.json({ status: "discarded", reason: "unknown_sender" });
  }

  const result = await processInboundReply(user.id, messageBody.trim(), "email");

  log.info({
    userId: user.id,
    intent: result.intent,
    success: result.success,
  }, "Inbound email reply processed");

  // If we need to respond, we'd send an email back here.
  // For now, the response is recorded in the DB and can be sent via Resend.
  if (result.success && result.responseText) {
    try {
      const { sendReplyEmail } = await import("@/lib/reply-delivery");
      await sendReplyEmail(senderEmail, result.responseText);
    } catch (err) {
      log.error({ err }, "Failed to send reply email (non-critical)");
    }
  }

  return NextResponse.json({
    status: "processed",
    intent: result.intent,
    itemNumber: result.itemNumber,
  });
}

function extractEmail(raw: string): string {
  // Handle "Name <email@example.com>" format
  const match = raw.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].toLowerCase().trim();
  return raw.toLowerCase().trim();
}

function stripQuotedContent(text: string): string {
  // Remove common quoted reply patterns
  const lines = text.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    // Stop at typical quote markers
    if (line.startsWith("On ") && line.includes(" wrote:")) break;
    if (line.startsWith(">")) break;
    if (line.startsWith("---")) break;
    if (line.match(/^-{3,}$/)) break;
    if (line.match(/^From:/i)) break;
    if (line.match(/^Sent:/i)) break;
    cleanLines.push(line);
  }

  return cleanLines.join("\n").trim();
}
