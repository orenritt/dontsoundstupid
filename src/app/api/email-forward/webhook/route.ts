import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  processInboundEmail,
} from "@/lib/email-forward";
import type { InboundEmail } from "@/models/email-forward";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const signature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-sendgrid-signature") ||
      "";

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const email: InboundEmail = {
      from: extractSenderEmail(payload),
      to: String(payload.to || payload.envelope?.to || ""),
      subject: String(payload.subject || "(no subject)"),
      textBody: (payload.text as string) || (payload.plain as string) || null,
      htmlBody: (payload.html as string) || null,
      headers: extractHeaders(payload),
      receivedAt: new Date().toISOString(),
    };

    if (!email.from) {
      return NextResponse.json(
        { error: "Missing sender address" },
        { status: 400 }
      );
    }

    const result = await processInboundEmail(email);

    if (result.error === "unrecognized-sender") {
      return NextResponse.json({ status: "ignored" });
    }

    if (result.error === "rate-limit-exceeded") {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    if (result.error === "empty-content") {
      return NextResponse.json({ status: "ignored", reason: "empty content" });
    }

    return NextResponse.json({ status: "processed", signalId: result.signalId });
  } catch (e) {
    console.error("Email forward webhook error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function extractSenderEmail(
  payload: Record<string, unknown>
): string {
  const from =
    (payload.from as string) ||
    (payload.sender as string) ||
    ((payload.envelope as Record<string, unknown>)?.from as string) ||
    "";

  const emailMatch = from.match(/<([^>]+)>/);
  return (emailMatch ? emailMatch[1] : from).toLowerCase().trim();
}

function extractHeaders(
  payload: Record<string, unknown>
): Record<string, string> {
  if (typeof payload.headers === "string") {
    try {
      return JSON.parse(payload.headers);
    } catch {
      return {};
    }
  }
  if (typeof payload.headers === "object" && payload.headers !== null) {
    return payload.headers as Record<string, string>;
  }
  return {};
}
