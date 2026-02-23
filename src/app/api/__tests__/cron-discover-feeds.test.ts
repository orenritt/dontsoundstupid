import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockInnerJoin = vi.fn();
const mockSmartDiscoverFeeds = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs);
          return {
            innerJoin: (...jArgs: unknown[]) => {
              mockInnerJoin(...jArgs);
              return {
                where: (...wArgs: unknown[]) => {
                  mockWhere(...wArgs);
                  return Promise.resolve([]);
                },
              };
            },
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
  userProfiles: {
    userId: "userId",
    lastDiscoveryAt: "lastDiscoveryAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock("@/lib/syndication", () => ({
  smartDiscoverFeeds: (...args: unknown[]) => mockSmartDiscoverFeeds(...args),
}));

describe("GET /api/cron/discover-feeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("allows access when CRON_SECRET is not set", async () => {
    mockWhere.mockResolvedValue([]);

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds");
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
            innerJoin: () => ({
              where: () => Promise.resolve([]),
            }),
          }),
        }),
      },
    }));
    vi.doMock("@/lib/schema", () => ({
      users: { id: "id", onboardingStatus: "onboardingStatus" },
      userProfiles: { userId: "userId", lastDiscoveryAt: "lastDiscoveryAt" },
    }));
    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn((...args: unknown[]) => args),
    }));
    vi.doMock("@/lib/syndication", () => ({
      smartDiscoverFeeds: vi.fn(),
    }));

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);

    delete process.env.CRON_SECRET;
  });

  it("filters users by discovery interval", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    mockWhere.mockResolvedValue([
      { userId: "user-1", lastDiscoveryAt: oldDate },
      { userId: "user-2", lastDiscoveryAt: recentDate },
      { userId: "user-3", lastDiscoveryAt: null },
    ]);

    mockSmartDiscoverFeeds
      .mockResolvedValueOnce({ feedsDiscovered: 3, sourcesAttempted: 10, errors: 0 })
      .mockResolvedValueOnce({ feedsDiscovered: 5, sourcesAttempted: 8, errors: 0 });

    const { GET } = await import("../cron/discover-feeds/route");
    const req = new Request("http://localhost:3000/api/cron/discover-feeds");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // user-2 has recent discovery, so only user-1 and user-3 should be processed
    expect(body.summary.usersProcessed).toBe(2);
    expect(body.summary.totalFeedsDiscovered).toBe(8);
  });

  it("handles discovery errors per-user", async () => {
    mockWhere.mockResolvedValue([
      { userId: "user-1", lastDiscoveryAt: null },
    ]);

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
