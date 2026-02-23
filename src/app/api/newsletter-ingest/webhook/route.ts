import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/email-forward";
import { processNewsletterEmail } from "@/lib/newsletter-ingest";

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

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const email = {
      from: extractField(payload, "from"),
      to: extractField(payload, "to"),
      subject: extractField(payload, "subject") || "(no subject)",
      textBody: (payload.text as string) || (payload.plain as string) || null,
      htmlBody: (payload.html as string) || null,
      receivedAt: new Date().toISOString(),
    };

    if (!email.to) {
      return NextResponse.json(
        { error: "Missing recipient address" },
        { status: 400 }
      );
    }

    const result = await processNewsletterEmail(email);

    if (result.error === "unknown-recipient") {
      return NextResponse.json({ status: "ignored", reason: "unknown recipient" });
    }

    if (result.error === "inactive-newsletter") {
      return NextResponse.json({ status: "ignored", reason: "inactive newsletter" });
    }

    if (result.error === "empty-body") {
      return NextResponse.json({ status: "ignored", reason: "empty body" });
    }

    return NextResponse.json({
      status: "processed",
      newsletterId: result.newsletterId,
      storiesExtracted: result.storiesExtracted,
      signalsCreated: result.signalsCreated,
    });
  } catch (e) {
    console.error("Newsletter ingest webhook error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function extractField(payload: Record<string, unknown>, field: string): string {
  const value =
    (payload[field] as string) ||
    ((payload.envelope as Record<string, unknown>)?.[field] as string) ||
    "";

  const emailMatch = value.match(/<([^>]+)>/);
  return (emailMatch ? emailMatch[1] : value).toLowerCase().trim();
}
