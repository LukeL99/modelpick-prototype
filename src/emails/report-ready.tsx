/**
 * React Email template for report completion notification.
 *
 * Sent when a benchmark report finishes processing.
 * Renders in email clients with inline styles (dark theme, ember-orange CTA).
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";
import * as React from "react";

export interface ReportReadyEmailProps {
  modelCount: number;
  imageCount: number;
  recommendedModel: string | null;
  reportUrl: string;
}

export default function ReportReadyEmail({
  modelCount = 5,
  imageCount = 3,
  recommendedModel = "Gemini 2.5 Flash",
  reportUrl = "https://modelpick.com/report/demo",
}: ReportReadyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your ModelPick benchmark report is ready</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>ModelPick</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={heading}>Your Benchmark Report is Ready</Text>

            <Text style={paragraph}>
              We&apos;ve finished benchmarking {modelCount} vision model
              {modelCount !== 1 ? "s" : ""} against your {imageCount} sample
              image{imageCount !== 1 ? "s" : ""}.
            </Text>

            {recommendedModel && (
              <Section style={highlightBox}>
                <Text style={highlightLabel}>Top Recommendation</Text>
                <Text style={highlightValue}>{recommendedModel}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              View detailed accuracy scores, field-level error diffs, cost
              breakdowns, and latency comparisons for every model tested.
            </Text>

            {/* CTA Button */}
            <Section style={ctaSection}>
              <Button style={ctaButton} href={reportUrl}>
                View Your Report
              </Button>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you purchased a ModelPick
              benchmark report.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Inline styles ────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#0f0f1a",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 20px",
};

const header: React.CSSProperties = {
  textAlign: "center" as const,
  paddingBottom: "24px",
};

const logo: React.CSSProperties = {
  color: "#e8764e",
  fontSize: "28px",
  fontWeight: 700,
  letterSpacing: "-0.5px",
  margin: 0,
};

const content: React.CSSProperties = {
  backgroundColor: "#1a1a2e",
  borderRadius: "12px",
  padding: "32px 28px",
  border: "1px solid #2a2a3e",
};

const heading: React.CSSProperties = {
  color: "#f0f0f5",
  fontSize: "22px",
  fontWeight: 600,
  lineHeight: "30px",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#a0a0b8",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const highlightBox: React.CSSProperties = {
  backgroundColor: "#242440",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
  borderLeft: "3px solid #e8764e",
};

const highlightLabel: React.CSSProperties = {
  color: "#a0a0b8",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const highlightValue: React.CSSProperties = {
  color: "#f0f0f5",
  fontSize: "18px",
  fontWeight: 600,
  margin: 0,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "28px 0 8px 0",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#e8764e",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: "8px",
  padding: "12px 32px",
  display: "inline-block",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #2a2a3e",
  margin: "28px 0",
};

const footer: React.CSSProperties = {
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  color: "#606078",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};
