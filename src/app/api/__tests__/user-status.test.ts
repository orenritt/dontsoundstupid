import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
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
              return { limit: mockLimit };
            },
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/schema", () => ({
  users: { id: "id", onboardingStatus: "onboardingStatus", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("GET /api/user/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("../user/status/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mockLimit.mockResolvedValue([]);

    const { GET } = await import("../user/status/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns user status and name", async () => {
    mockLimit.mockResolvedValue([
      { id: "user-123", onboardingStatus: "completed", name: "Jane Doe" },
    ]);

    const { GET } = await import("../user/status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.onboardingStatus).toBe("completed");
    expect(body.name).toBe("Jane Doe");
  });

  it("returns null name when user has no name", async () => {
    mockLimit.mockResolvedValue([
      { id: "user-123", onboardingStatus: "not_started", name: null },
    ]);

    const { GET } = await import("../user/status/route");
    const res = await GET();
    const body = await res.json();
    expect(body.name).toBeNull();
  });
});
