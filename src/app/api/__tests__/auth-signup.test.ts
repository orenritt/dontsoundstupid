import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

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
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...vArgs: unknown[]) => {
          mockValues(...vArgs);
          return { returning: mockReturning };
        },
      };
    },
  },
}));

vi.mock("@/lib/schema", () => ({
  users: { id: "id", email: "email" },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashed"),
  },
}));

import { POST } from "../auth/signup/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([{ id: "new-user-uuid" }]);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "longpassword" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "user@test.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(
      makeRequest({ email: "user@test.com", password: "short" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("8 characters");
  });

  it("returns 409 when email already exists", async () => {
    mockLimit.mockResolvedValue([{ id: "existing-id" }]);

    const res = await POST(
      makeRequest({ email: "existing@test.com", password: "longpassword" })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already exists");
  });

  it("returns 201 with user id on success", async () => {
    const res = await POST(
      makeRequest({ email: "new@test.com", password: "securepassword" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("new-user-uuid");
  });

  it("hashes the password before storing", async () => {
    await POST(
      makeRequest({ email: "new@test.com", password: "securepassword" })
    );

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "$2a$12$hashed" })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockLimit.mockRejectedValue(new Error("DB connection failed"));

    const res = await POST(
      makeRequest({ email: "new@test.com", password: "securepassword" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Something went wrong");
  });
});
