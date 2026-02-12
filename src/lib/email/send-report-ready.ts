/**
 * Send report completion email via Resend with React Email template.
 *
 * In mock mode (DEBUG_MOCK_EMAIL=true), logs email details instead of sending.
 * Email failure is non-fatal -- benchmark results are preserved regardless.
 */

import { Resend } from "resend";
import { isMockEmail } from "@/lib/debug/mock-config";
import ReportReadyEmail from "@/emails/report-ready";

export interface SendReportReadyParams {
  to: string;
  reportId: string;
  shareToken: string;
  modelCount: number;
  imageCount: number;
  recommendedModel: string | null;
}

/**
 * Send the "report ready" email notification.
 *
 * Uses Resend to send a React Email template with:
 * - Model count and image count summary
 * - Top recommendation highlight (if available)
 * - CTA button linking to the report page
 *
 * In mock mode, logs the email content to console.
 * All errors are caught and logged -- email failure never affects benchmark results.
 */
export async function sendReportReadyEmail(
  params: SendReportReadyParams
): Promise<void> {
  const { to, reportId, shareToken, modelCount, imageCount, recommendedModel } =
    params;

  // Mock mode: log instead of sending
  if (isMockEmail()) {
    console.log("[email:mock] Report ready email:", {
      to,
      subject: "Your ModelBlitz Benchmark Report is Ready",
      reportId,
      shareToken,
      modelCount,
      imageCount,
      recommendedModel,
    });
    return;
  }

  // Real mode: send via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set. Skipping email send for report:",
      reportId
    );
    return;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://modelblitz.com";
  const reportUrl = `${siteUrl}/report/${shareToken}`;

  // Determine sender address
  // Use custom domain if RESEND_FROM_EMAIL is set, otherwise use Resend's onboarding sender
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "ModelBlitz <onboarding@resend.dev>";

  try {
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Your ModelBlitz Benchmark Report is Ready",
      react: ReportReadyEmail({
        modelCount,
        imageCount,
        recommendedModel,
        reportUrl,
      }),
    });

    console.log(`[email] Report ready email sent to ${to}`);
  } catch (err) {
    // Email failure is non-fatal
    console.error("[email] Failed to send report ready email:", err);
  }
}
