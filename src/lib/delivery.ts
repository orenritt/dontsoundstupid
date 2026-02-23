import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

interface BriefingItem {
  id: string;
  reason: string;
  reasonLabel: string;
  topic: string;
  content: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

interface DeliveryPayload {
  toEmail: string;
  userName: string;
  items: BriefingItem[];
  briefingId: string;
  appUrl?: string;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildHtml(payload: DeliveryPayload): string {
  const { userName, items, briefingId, appUrl = "https://web-production-5d29a.up.railway.app" } = payload;
  const firstName = userName.split(" ")[0] || "there";
  const date = formatDate();

  const itemsHtml = items
    .map(
      (item, i) => `
    <tr>
      <td style="padding: 20px 0; border-bottom: 1px solid #2a2a2a;">
        <div style="font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          ${escapeHtml(item.reasonLabel)}
        </div>
        <div style="font-size: 15px; color: #e0e0e0; line-height: 1.5; margin-bottom: 8px;">
          ${escapeHtml(item.content)}
        </div>
        ${
          item.sourceUrl
            ? `<a href="${escapeHtml(item.sourceUrl)}" style="font-size: 12px; color: #666; text-decoration: none;">${escapeHtml(item.sourceLabel || "Source")} &rarr;</a>`
            : ""
        }
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <div style="font-size: 13px; color: #555; margin-bottom: 4px;">${date}</div>
              <div style="font-size: 22px; font-weight: 600; color: #ffffff;">Your briefing, ${escapeHtml(firstName)}.</div>
            </td>
          </tr>

          <!-- Items -->
          ${itemsHtml}

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <a href="${appUrl}/briefing" style="display: inline-block; padding: 10px 24px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">
                Open in app
              </a>
              <div style="margin-top: 24px; font-size: 11px; color: #444;">
                Don't Sound Stupid &middot; <a href="${appUrl}/settings/delivery" style="color: #444; text-decoration: underline;">Delivery settings</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(payload: DeliveryPayload): string {
  const { userName, items, appUrl = "https://web-production-5d29a.up.railway.app" } = payload;
  const firstName = userName.split(" ")[0] || "there";
  const date = formatDate();

  const itemsText = items
    .map(
      (item, i) =>
        `${item.reasonLabel.toUpperCase()}\n${item.content}${item.sourceUrl ? `\n${item.sourceLabel || "Source"}: ${item.sourceUrl}` : ""}`
    )
    .join("\n\n---\n\n");

  return `${date}\nYour briefing, ${firstName}.\n\n${itemsText}\n\n---\nOpen in app: ${appUrl}/briefing`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FROM_ADDRESS = "briefing@dontsoundstupid.com";

export async function sendBriefingEmail(
  payload: DeliveryPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await getResend().emails.send({
      from: `Don't Sound Stupid <${FROM_ADDRESS}>`,
      to: payload.toEmail,
      subject: `Your briefing — ${formatDate()}`,
      html: buildHtml(payload),
      text: buildText(payload),
      tags: [
        { name: "briefing_id", value: payload.briefingId },
      ],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to send briefing email:", message);
    return { success: false, error: message };
  }
}
