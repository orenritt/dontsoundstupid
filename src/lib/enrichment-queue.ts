import type { EnrichmentDepth } from "./schema";

export type EnrichmentPriority =
  | "calendar-24h"
  | "calendar-7d"
  | "new-contact"
  | "scheduled-reenrichment";

const PRIORITY_ORDER: Record<EnrichmentPriority, number> = {
  "calendar-24h": 0,
  "calendar-7d": 1,
  "new-contact": 2,
  "scheduled-reenrichment": 3,
};

export type ContactTier = "core" | "temporary";

export interface EnrichmentJob {
  contactId: string;
  userId: string;
  priority: EnrichmentPriority;
  contactTier: ContactTier;
  depth: EnrichmentDepth;
  queuedAt: Date;
}

const PERPLEXITY_MIN_INTERVAL_MS = 2000;
const TAVILY_MIN_INTERVAL_MS = 1000;

let lastPerplexityCall = 0;
let lastTavilyCall = 0;

export function getApiDelays(): {
  perplexityWaitMs: number;
  tavilyWaitMs: number;
} {
  const now = Date.now();
  return {
    perplexityWaitMs: Math.max(
      0,
      PERPLEXITY_MIN_INTERVAL_MS - (now - lastPerplexityCall)
    ),
    tavilyWaitMs: Math.max(
      0,
      TAVILY_MIN_INTERVAL_MS - (now - lastTavilyCall)
    ),
  };
}

export function markPerplexityCalled(): void {
  lastPerplexityCall = Date.now();
}

export function markTavilyCalled(): void {
  lastTavilyCall = Date.now();
}

export class EnrichmentQueue {
  private jobs: EnrichmentJob[] = [];
  private contactIds = new Set<string>();

  enqueue(job: Omit<EnrichmentJob, "queuedAt">): boolean {
    if (this.contactIds.has(job.contactId)) {
      return false;
    }

    this.contactIds.add(job.contactId);
    this.jobs.push({ ...job, queuedAt: new Date() });
    this.jobs.sort((a, b) => {
      const priorityDiff =
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const tierDiff = tierOrder(a.contactTier) - tierOrder(b.contactTier);
      if (tierDiff !== 0) return tierDiff;

      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
    return true;
  }

  dequeue(): EnrichmentJob | undefined {
    const job = this.jobs.shift();
    if (job) {
      this.contactIds.delete(job.contactId);
    }
    return job;
  }

  peek(): EnrichmentJob | undefined {
    return this.jobs[0];
  }

  size(): number {
    return this.jobs.length;
  }

  has(contactId: string): boolean {
    return this.contactIds.has(contactId);
  }

  clear(): void {
    this.jobs = [];
    this.contactIds.clear();
  }
}

function tierOrder(tier: ContactTier): number {
  return tier === "core" ? 0 : 1;
}

export const enrichmentQueue = new EnrichmentQueue();
