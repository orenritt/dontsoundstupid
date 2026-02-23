import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockScanKnowledgeGaps = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs);
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs);
              return Promise.resolve([]);
            },
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/schema", () => ({
  users: {
    id: "id",
    onboardingStatus: "onboardingStatus",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock("@/lib/knowledge-gap-scan", () => ({
  scanKnowledgeGaps: (...args: unknown[]) => mockScanKnowledgeGaps(...args),
}));

describe("GET /api/cron/knowledge-gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("allows access when CRON_SECRET is not set", async () => {
    mockWhere.mockResolvedValue([]);

    const { GET } = await import("../cron/knowledge-gaps/route");
    const req = new Request("http://localhost:3000/api/cron/knowledge-gaps");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("rejects requests with wrong secret", async () => {
    process.env.CRON_SECRET = "correct-secret";

    vi.resetModules();
    vi.doMock("@/lib/db", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => Promise.resolve([]),
          }),
        }),
      },
    }));
    vi.doMock("@/lib/schema", () => ({
      users: { id: "id", onboardingStatus: "onboardingStatus" },
    }));
    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn((...args: unknown[]) => args),
    }));
    vi.doMock("@/lib/knowledge-gap-scan", () => ({
      scanKnowledgeGaps: vi.fn(),
    }));

    const { GET } = await import("../cron/knowledge-gaps/route");
    const req = new Request("http://localhost:3000/api/cron/knowledge-gaps", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);

    delete process.env.CRON_SECRET;
  });

  it("processes all completed users and returns summary", async () => {
    const users = [{ id: "user-1" }, { id: "user-2" }, { id: "user-3" }];
    mockWhere.mockResolvedValue(users);

    mockScanKnowledgeGaps
      .mockResolvedValueOnce({ gapsFound: 5, queriesAdded: 3, entitiesSeeded: 4 })
      .mockResolvedValueOnce({ gapsFound: 8, queriesAdded: 6, entitiesSeeded: 7 })
      .mockResolvedValueOnce({ gapsFound: 3, queriesAdded: 2, entitiesSeeded: 1 });

    const { GET } = await import("../cron/knowledge-gaps/route");
    const req = new Request("http://localhost:3000/api/cron/knowledge-gaps");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.usersProcessed).toBe(3);
    expect(body.summary.totalGapsFound).toBe(16);
    expect(body.summary.totalQueriesAdded).toBe(11);
    expect(body.summary.totalEntitiesSeeded).toBe(12);
    expect(body.summary.errors).toBe(0);
    expect(body.results).toHaveLength(3);
  });

  it("handles per-user errors without crashing the batch", async () => {
    const users = [{ id: "user-1" }, { id: "user-2" }];
    mockWhere.mockResolvedValue(users);

    mockScanKnowledgeGaps
      .mockResolvedValueOnce({ gapsFound: 5, queriesAdded: 3, entitiesSeeded: 4 })
      .mockRejectedValueOnce(new Error("LLM timeout"));

    const { GET } = await import("../cron/knowledge-gaps/route");
    const req = new Request("http://localhost:3000/api/cron/knowledge-gaps");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.usersProcessed).toBe(2);
    expect(body.summary.errors).toBe(1);

    // First user succeeded
    expect(body.results[0].gapsFound).toBe(5);
    expect(body.results[0].error).toBeUndefined();

    // Second user failed
    expect(body.results[1].error).toBe("LLM timeout");
    expect(body.results[1].gapsFound).toBe(0);
  });

  it("returns empty results when no users exist", async () => {
    mockWhere.mockResolvedValue([]);

    const { GET } = await import("../cron/knowledge-gaps/route");
    const req = new Request("http://localhost:3000/api/cron/knowledge-gaps");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.usersProcessed).toBe(0);
    expect(body.results).toHaveLength(0);
  });
});
