import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../schema", () => ({
  users: { id: "users.id" },
  userProfiles: { userId: "userProfiles.userId" },
  knowledgeEntities: { id: "ke.id", userId: "ke.userId", source: "ke.source" },
  knowledgeEdges: { sourceEntityId: "kedge.sourceEntityId", targetEntityId: "kedge.targetEntityId" },
  prunedEntities: { id: "pe.id", userId: "pe.userId", name: "pe.name", entityType: "pe.entityType" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ a, b }),
  and: (...args: unknown[]) => args,
  or: (...args: unknown[]) => args,
  notInArray: (col: unknown, vals: unknown[]) => ({ col, vals }),
}));

vi.mock("../llm", () => ({
  chat: vi.fn(),
  embed: vi.fn().mockResolvedValue([]),
}));

vi.mock("../safe-parse", () => ({
  toStringArray: (v: unknown) => (Array.isArray(v) ? v.map(String) : []),
}));

vi.mock("../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { isEntitySuppressed, pruneKnowledgeGraph } from "../knowledge-prune";
import { db } from "../db";
import { chat } from "../llm";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const mockChat = chat as ReturnType<typeof vi.fn>;

describe("isEntitySuppressed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when entity is in suppression list", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ id: "some-id" }],
        }),
      }),
    });

    const result = await isEntitySuppressed("user-1", "Machine Learning", "concept");
    expect(result).toBe(true);
  });

  it("returns false when entity is not suppressed", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    const result = await isEntitySuppressed("user-1", "HL7 FHIR", "concept");
    expect(result).toBe(false);
  });
});

describe("pruneKnowledgeGraph", () => {
  const testUserId = "test-user-456";

  const mockUser = {
    id: testUserId,
    title: "VP Product",
    company: "HealthCo",
  };

  const mockProfile = {
    userId: testUserId,
    parsedTopics: ["Digital Health", "Remote Patient Monitoring"],
    parsedExpertAreas: ["FDA Compliance"],
  };

  const mockEntities = [
    { id: "e1", name: "Machine Learning", entityType: "concept", description: "", source: "industry-scan", confidence: 0.8 },
    { id: "e2", name: "HL7 FHIR", entityType: "concept", description: "", source: "industry-scan", confidence: 0.8 },
    { id: "e3", name: "Acme Corp", entityType: "company", description: "", source: "profile-derived", confidence: 1.0 },
    { id: "e4", name: "Kubernetes", entityType: "concept", description: "", source: "rapid-fire", confidence: 1.0 },
    { id: "e5", name: "Cloud Computing", entityType: "concept", description: "", source: "industry-scan", confidence: 0.8 },
  ];

  let insertedPrunes: { name: string; entityType: string; reason: string }[];
  let deletedEntityIds: string[];

  function setupMocks() {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => {
          selectCallCount++;
          if (selectCallCount === 1) return { limit: () => [mockUser] };
          if (selectCallCount === 2) return { limit: () => [mockProfile] };
          if (selectCallCount === 3) return Promise.resolve(mockEntities);
          return Promise.resolve([]);
        },
      }),
    }));

    const onConflictDoNothing = vi.fn();
    mockDb.insert.mockImplementation(() => ({
      values: (val: Record<string, unknown>) => {
        insertedPrunes.push({
          name: val.name as string,
          entityType: val.entityType as string,
          reason: val.reason as string,
        });
        return { onConflictDoNothing };
      },
    }));

    mockDb.delete.mockImplementation(() => ({
      where: (condition: unknown) => {
        if (condition && typeof condition === "object" && "a" in (condition as Record<string, unknown>)) {
          const c = condition as { b: string };
          deletedEntityIds.push(c.b);
        }
        return Promise.resolve();
      },
    }));

    mockChat.mockResolvedValue({
      content: JSON.stringify([
        { name: "Machine Learning", keep: false, reason: "Too general — any professional knows this" },
        { name: "HL7 FHIR", keep: true, reason: "Specific to health-tech interoperability" },
        { name: "Cloud Computing", keep: false, reason: "Too general — baseline knowledge" },
      ]),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertedPrunes = [];
    deletedEntityIds = [];
    setupMocks();
  });

  it("exempts profile-derived and rapid-fire entities from pruning", async () => {
    const result = await pruneKnowledgeGraph(testUserId);
    expect(result.exempt).toBe(2);
    const prunedNames = insertedPrunes.map((p) => p.name);
    expect(prunedNames).not.toContain("Acme Corp");
    expect(prunedNames).not.toContain("Kubernetes");
  });

  it("prunes entities marked as not keep by the LLM", async () => {
    const result = await pruneKnowledgeGraph(testUserId);
    expect(result.pruned).toBe(2);
    const prunedNames = insertedPrunes.map((p) => p.name);
    expect(prunedNames).toContain("Machine Learning");
    expect(prunedNames).toContain("Cloud Computing");
  });

  it("keeps entities marked as keep by the LLM", async () => {
    const result = await pruneKnowledgeGraph(testUserId);
    expect(result.kept).toBe(1);
    const prunedNames = insertedPrunes.map((p) => p.name);
    expect(prunedNames).not.toContain("HL7 FHIR");
  });

  it("stores the reason for each pruned entity", async () => {
    await pruneKnowledgeGraph(testUserId);
    const mlPrune = insertedPrunes.find((p) => p.name === "Machine Learning");
    expect(mlPrune?.reason).toContain("Too general");
  });

  it("returns zero counts when user not found", async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    }));

    const result = await pruneKnowledgeGraph(testUserId);
    expect(result.pruned).toBe(0);
    expect(result.kept).toBe(0);
    expect(result.exempt).toBe(0);
  });

  it("keeps all entities when LLM call fails", async () => {
    mockChat.mockRejectedValue(new Error("API error"));
    const result = await pruneKnowledgeGraph(testUserId);
    expect(result.pruned).toBe(0);
    expect(result.kept).toBe(3);
  });
});
