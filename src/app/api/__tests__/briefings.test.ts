import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

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
              return {
                orderBy: (...oArgs: unknown[]) => {
                  mockOrderBy(...oArgs);
                  return { limit: mockLimit };
                },
              };
            },
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/schema", () => ({
  briefings: {
    id: "id",
    userId: "userId",
    items: "items",
    generatedAt: "generatedAt",
    modelUsed: "modelUsed",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((...args: unknown[]) => args),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("GET /api/briefings/latest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("../briefings/latest/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns null when user has no briefings", async () => {
    mockLimit.mockResolvedValue([]);

    const { GET } = await import("../briefings/latest/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.briefing).toBeNull();
  });

  it("returns latest briefing when available", async () => {
    const briefing = {
      id: "b-123",
      userId: "user-123",
      items: [{ topic: "AI", content: "Test" }],
      generatedAt: new Date().toISOString(),
    };
    mockLimit.mockResolvedValue([briefing]);

    const { GET } = await import("../briefings/latest/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.briefing.id).toBe("b-123");
  });
});

describe("GET /api/briefings/archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("../briefings/archive/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty array when no briefings exist", async () => {
    mockLimit.mockResolvedValue([]);

    const { GET } = await import("../briefings/archive/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.briefings).toEqual([]);
  });

  it("returns archived briefings", async () => {
    const briefings = [
      { id: "b-1", items: [], createdAt: "2026-01-01", modelUsed: "gpt-4o-mini" },
      { id: "b-2", items: [], createdAt: "2026-01-02", modelUsed: "gpt-4o-mini" },
    ];
    mockLimit.mockResolvedValue(briefings);

    const { GET } = await import("../briefings/archive/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.briefings).toHaveLength(2);
  });
});
