import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...vArgs: unknown[]) => {
          mockValues(...vArgs);
          return {
            onConflictDoNothing: (...args: unknown[]) => {
              mockOnConflictDoNothing(...args);
              return Promise.resolve();
            },
            then: (resolve: (v: unknown) => void) => resolve(undefined),
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/schema", () => ({
  feedbackSignals: { userId: "userId" },
  knowledgeEntities: { userId: "userId" },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/llm", () => ({
  embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  chat: vi.fn().mockResolvedValue({
    content: "Expanded content here.",
    promptTokens: 50,
    completionTokens: 30,
    model: "gpt-4o-mini",
    provider: "openai",
  }),
}));

vi.mock("@/lib/ai-research", () => ({
  searchPerplexity: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/safe-parse", () => ({
  toStringArray: vi.fn().mockReturnValue([]),
}));

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/feedback/tune", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback/tune", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("../feedback/tune/route");
    const res = await POST(makeRequest({ briefingId: "b1", itemId: "i1", direction: "up", topic: "AI" }));
    expect(res.status).toBe(401);
  });

  it("inserts more-like-this feedback for direction=up", async () => {
    const { POST } = await import("../feedback/tune/route");
    const res = await POST(
      makeRequest({
        briefingId: "b1",
        itemId: "i1",
        direction: "up",
        topic: "AI",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: "more-like-this" })
    );
  });

  it("inserts less-like-this feedback for direction=down", async () => {
    const { POST } = await import("../feedback/tune/route");
    const res = await POST(
      makeRequest({
        briefingId: "b1",
        itemId: "i1",
        direction: "down",
        topic: "Sports",
      })
    );

    expect(res.status).toBe(200);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: "less-like-this" })
    );
  });
});

describe("POST /api/feedback/not-novel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("../feedback/not-novel/route");
    const res = await POST(
      makeRequest({ briefingId: "b1", itemId: "i1", topic: "Old News" })
    );
    expect(res.status).toBe(401);
  });

  it("records not-novel feedback", async () => {
    const { POST } = await import("../feedback/not-novel/route");
    const res = await POST(
      makeRequest({ briefingId: "b1", itemId: "i1", topic: "Old News" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: "not-novel" })
    );
  });
});

describe("POST /api/feedback/deep-dive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("../feedback/deep-dive/route");
    const res = await POST(
      makeRequest({
        briefingId: "b1",
        itemId: "i1",
        topic: "AI",
        content: "Some content",
      })
    );
    expect(res.status).toBe(401);
  });
});
