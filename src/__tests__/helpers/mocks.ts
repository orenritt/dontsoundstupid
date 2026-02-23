/**
 * Shared mocks for unit tests that need to avoid hitting real databases and APIs.
 */
import { vi } from "vitest";

// ── Database Mock ──────────────────────────────────────────────────────────

export function createMockDb() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  };

  return mockChain;
}

// ── Auth Mock ──────────────────────────────────────────────────────────────

export function mockAuthSession(userId: string | null, extra?: { email?: string; name?: string }) {
  return userId
    ? {
        user: {
          id: userId,
          email: extra?.email ?? "test@example.com",
          name: extra?.name ?? "Test User",
        },
      }
    : null;
}

// ── LLM Mock ───────────────────────────────────────────────────────────────

export function createMockLlmResponse(content: string) {
  return {
    content,
    promptTokens: 100,
    completionTokens: 50,
    model: "gpt-4o-mini",
    provider: "openai" as const,
  };
}

// ── Fixtures ───────────────────────────────────────────────────────────────

export const FIXTURES = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  briefingId: "660e8400-e29b-41d4-a716-446655440000",
  itemId: "770e8400-e29b-41d4-a716-446655440000",

  user: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "test@example.com",
    name: "Jane Doe",
    title: "VP of Strategy",
    company: "Acme Corp",
    onboardingStatus: "completed" as const,
    passwordHash: "$2a$12$fake",
    linkedinUrl: null,
    linkedinPhotoUrl: null,
    createdAt: new Date(),
  },

  profile: {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    conversationTranscript: "I work in insurance technology...",
    parsedTopics: ["insurtech", "climate risk", "parametric insurance"],
    parsedInitiatives: ["digital transformation", "AI integration"],
    parsedConcerns: ["regulatory compliance", "market volatility"],
    parsedExpertAreas: ["underwriting", "reinsurance"],
    parsedWeakAreas: ["blockchain", "DeFi"],
    parsedKnowledgeGaps: ["quantum computing in finance"],
    rapidFireClassifications: [
      { topic: "insurtech", context: "", response: "know-tons" },
      { topic: "DeFi", context: "", response: "need-more" },
    ],
  },

  briefingItem: {
    id: "770e8400-e29b-41d4-a716-446655440000",
    reason: "Relates to your initiative: digital transformation",
    reasonLabel: "Initiative Match",
    topic: "AI in Insurance Underwriting",
    content: "New AI models are improving underwriting accuracy by 30%.",
    sourceUrl: "https://example.com/article",
    sourceLabel: "Reuters",
  },

  signals: [
    {
      title: "Parametric insurance adoption surges",
      summary: "Major reinsurers adopting parametric models for climate risk.",
      sourceUrl: "https://example.com/1",
      sourceLabel: "Reuters",
    },
    {
      title: "New ESG reporting requirements",
      summary: "SEC mandates enhanced climate disclosure.",
      sourceUrl: "https://example.com/2",
      sourceLabel: "Bloomberg",
    },
  ],
};
