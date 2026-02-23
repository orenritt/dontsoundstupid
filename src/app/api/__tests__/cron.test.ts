import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The cron routes use two query patterns:
 *   1. select().from(users).where() → resolves to array directly (no .limit)
 *   2. select().from(briefings).where().limit() → resolves via .limit()
 *
 * We track call counts to return different values for each query.
 */

let queryCallCount = 0;
const mockLimit = vi.fn();

function createMockWhere() {
  return vi.fn((..._args: unknown[]) => {
    queryCallCount++;
    if (queryCallCount === 1) {
      return Promise.resolve([]);
    }
    return { limit: mockLimit };
  });
}

let mockWhere = createMockWhere();

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: (...args: unknown[]) => mockWhere(...args),
      })),
    })),
  },
}));

vi.mock("@/lib/schema", () => ({
  users: { id: "id", email: "email", name: "name", onboardingStatus: "onboardingStatus" },
  briefings: { id: "id", userId: "userId", generatedAt: "generatedAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gte: vi.fn((...args: unknown[]) => args),
}));

vi.mock("@/lib/pipeline", () => ({
  runPipeline: vi.fn().mockResolvedValue("b-123"),
}));

vi.mock("@/lib/news-ingestion", () => ({
  refreshQueriesForUser: vi.fn().mockResolvedValue(undefined),
  deriveNewsQueries: vi.fn().mockResolvedValue(undefined),
  pollNewsQueries: vi.fn().mockResolvedValue({ signals: [] }),
}));

vi.mock("@/lib/syndication", () => ({
  deriveFeedsForUser: vi.fn().mockResolvedValue(0),
  pollSyndicationFeeds: vi.fn().mockResolvedValue({ feedsPolled: 0, newItems: 0, signals: [], errors: 0 }),
}));

vi.mock("@/lib/ai-research", () => ({
  runAiResearch: vi.fn().mockResolvedValue([]),
}));

describe("GET /api/cron/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCallCount = 0;
    mockWhere = createMockWhere();
    delete process.env.CRON_SECRET;
  });

  it("returns summary when no users exist", async () => {
    const { GET } = await import("../cron/daily/route");
    const req = new Request("http://localhost:3000/api/cron/daily");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeDefined();
    expect(body.summary.total).toBe(0);
    expect(body.results).toEqual([]);
  });

  it("processes users and returns results", async () => {
    queryCallCount = 0;
    mockWhere = vi.fn((..._args: unknown[]) => {
      queryCallCount++;
      if (queryCallCount === 1) {
        return Promise.resolve([{ id: "user-1", email: "u1@test.com", name: "User 1" }]);
      }
      return { limit: mockLimit };
    });
    mockLimit.mockResolvedValue([]);

    const { GET } = await import("../cron/daily/route");
    const req = new Request("http://localhost:3000/api/cron/daily");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.total).toBe(1);
  });
});

describe("GET /api/cron/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCallCount = 0;
    mockWhere = createMockWhere();
    delete process.env.CRON_SECRET;
  });

  it("returns summary when no users exist", async () => {
    const { GET } = await import("../cron/ingest/route");
    const req = new Request("http://localhost:3000/api/cron/ingest");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeDefined();
    expect(body.summary.usersProcessed).toBe(0);
  });
});

describe("Cron auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCallCount = 0;
    mockWhere = createMockWhere();
  });

  it("accepts valid Bearer token", async () => {
    process.env.CRON_SECRET = "my-secret";
    vi.resetModules();

    vi.doMock("@/lib/db", () => ({
      db: {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])),
          })),
        })),
      },
    }));
    vi.doMock("@/lib/schema", () => ({
      users: {},
      briefings: {},
    }));
    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn(),
      and: vi.fn(),
      gte: vi.fn(),
    }));
    vi.doMock("@/lib/pipeline", () => ({ runPipeline: vi.fn() }));
    vi.doMock("@/lib/news-ingestion", () => ({ refreshQueriesForUser: vi.fn() }));

    const { GET } = await import("../cron/daily/route");
    const req = new Request("http://localhost:3000/api/cron/daily", {
      headers: { authorization: "Bearer my-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    delete process.env.CRON_SECRET;
  });

  it("rejects wrong Bearer token", async () => {
    process.env.CRON_SECRET = "correct";
    vi.resetModules();

    vi.doMock("@/lib/db", () => ({
      db: {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])),
          })),
        })),
      },
    }));
    vi.doMock("@/lib/schema", () => ({
      users: {},
      briefings: {},
    }));
    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn(),
      and: vi.fn(),
      gte: vi.fn(),
    }));
    vi.doMock("@/lib/pipeline", () => ({ runPipeline: vi.fn() }));
    vi.doMock("@/lib/news-ingestion", () => ({ refreshQueriesForUser: vi.fn() }));

    const { GET } = await import("../cron/daily/route");
    const req = new Request("http://localhost:3000/api/cron/daily", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);

    delete process.env.CRON_SECRET;
  });
});
