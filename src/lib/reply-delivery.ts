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

const FROM_ADDRESS = process.env.EMAIL_FROM || "onboarding@resend.dev";
const EMAIL_OVERRIDE = process.env.EMAIL_OVERRIDE;

export async function sendReplyEmail(
  toEmail: string,
  responseText: string
): Promise<void> {
  const to = EMAIL_OVERRIDE || toEmail;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td style="padding: 20px 0;">
              <div style="font-size: 15px; color: #e0e0e0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(responseText)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #2a2a2a;">
              <div style="font-size: 11px; color: #444;">Don't Sound Stupid</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from: `Don't Sound Stupid <${FROM_ADDRESS}>`,
    to,
    subject: "Re: Your briefing",
    html,
    text: responseText,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
