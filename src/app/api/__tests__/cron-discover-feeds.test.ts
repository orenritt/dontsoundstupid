import { describe, it, expect, vi, beforeEach } from "vitest";

const mockWhere = vi.fn();
const mockSmartDiscoverFeeds = vi.fn();

function makeMockDb() {
  return {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: (...wArgs: unknown[]) => {
            mockWhere(...wArgs);
            return mockWhere();
          },
        }),
        where: (...wArgs: unknown[]) => {
          mockWhere(...wArgs);
          return mockWhere();
        },
      }),
    }),
  };
}

describe("GET /api/cron/discover-feeds", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  function setupMocks() {
    vi.doMock("@/lib/db", () => ({ db: makeMockDb() }));
    vi.doMock("@/lib/schema", () => ({
      users: { id: "id", onboardingStatus: "onboardingStatus" },
      userProfiles: { userId: "userId", lastDiscoveryAt: "lastDiscoveryAt" },
    }));
    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn((...args: unknown[]) => args),
    }));
    vi.doMock("@/lib/syndication", () => ({
      smartDiscoverFeeds: (...args: unknown[]) => mockSmartDiscoverFeeds(...args),
    }));
  }

  it("allows access when CRON_SECRET is not set", async () => {
    setupMocks();
    mockWhere.mockReturnValue(Promise.resolve([]));

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("rejects requests with wrong secret", async () => {
    process.env.CRON_SECRET = "correct-secret";
    setupMocks();

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("filters users by discovery interval", async () => {
    setupMocks();
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    mockWhere.mockReturnValue(
      Promise.resolve([
        { userId: "user-1", lastDiscoveryAt: oldDate },
        { userId: "user-2", lastDiscoveryAt: recentDate },
        { userId: "user-3", lastDiscoveryAt: null },
      ])
    );

    mockSmartDiscoverFeeds
      .mockResolvedValueOnce({ feedsDiscovered: 3, sourcesAttempted: 10, errors: 0 })
      .mockResolvedValueOnce({ feedsDiscovered: 5, sourcesAttempted: 8, errors: 0 });

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.usersProcessed).toBe(2);
    expect(body.summary.totalFeedsDiscovered).toBe(8);
  });

  it("handles discovery errors per-user", async () => {
    setupMocks();
    mockWhere.mockReturnValue(
      Promise.resolve([{ userId: "user-1", lastDiscoveryAt: null }])
    );

    mockSmartDiscoverFeeds.mockRejectedValueOnce(new Error("DNS resolution failed"));

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results[0].errors).toBe(1);
    expect(body.results[0].feedsDiscovered).toBe(0);
  });
});
