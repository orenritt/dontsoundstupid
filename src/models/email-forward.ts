export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  headers: Record<string, string>;
  receivedAt: string;
}

export interface ParsedForward {
  userAnnotation: string | null;
  forwardedContent: string;
  originalSender: string | null;
  subject: string;
  extractedUrls: string[];
  primaryUrl: string | null;
}

export interface UrlEnrichment {
  url: string;
  title: string | null;
  description: string | null;
  fetchedAt: string;
}

export interface EmailForwardSignalMetadata {
  userAnnotation: string | null;
  originalSender: string | null;
  forwardedAt: string;
  extractedUrls: string[];
  primaryUrlTitle: string | null;
  primaryUrlDescription: string | null;
}

export interface EmailForwardConfig {
  maxForwardsPerUserPerDay: number;
  webhookSecret: string;
  urlEnrichmentTimeoutMs: number;
}

export const DEFAULT_EMAIL_FORWARD_CONFIG: EmailForwardConfig = {
  maxForwardsPerUserPerDay: 20,
  webhookSecret: process.env.EMAIL_FORWARD_WEBHOOK_SECRET || "",
  urlEnrichmentTimeoutMs: 5000,
};
