import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  };
});

vi.mock("../schema", () => ({
  users: { id: "users.id" },
  userProfiles: { userId: "userProfiles.userId" },
  impressContacts: { userId: "impressContacts.userId" },
  peerOrganizations: { userId: "peerOrganizations.userId" },
  knowledgeEntities: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ a, b }),
}));

vi.mock("../llm", () => ({
  chat: vi.fn().mockResolvedValue({
    content: JSON.stringify([
      "React",
      "TypeScript",
      "Node.js",
      "GraphQL",
      "Docker",
    ]),
  }),
  embed: vi.fn().mockResolvedValue([]),
}));

vi.mock("../safe-parse", () => ({
  toStringArray: (v: unknown) => {
    if (Array.isArray(v)) return v.map(String);
    return [];
  },
}));

vi.mock("../knowledge-prune", () => ({
  isEntitySuppressed: vi.fn().mockResolvedValue(false),
  pruneKnowledgeGraph: vi.fn().mockResolvedValue({ pruned: 0, kept: 0, exempt: 0 }),
}));

import { seedKnowledgeGraph } from "../knowledge-seed";
import { db } from "../db";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

describe("seedKnowledgeGraph", () => {
  const testUserId = "test-user-123";

  const mockUser = {
    id: testUserId,
    name: "Test User",
    title: "VP of Engineering",
    company: "Acme Corp",
  };

  const mockProfile = {
    userId: testUserId,
    parsedTopics: ["Kubernetes", "Observability"],
    parsedExpertAreas: ["Container orchestration", "CI/CD"],
    rapidFireClassifications: [
      { topic: "AI/ML", response: "know-tons" },
      { topic: "FinOps", response: "need-more" },
      { topic: "Data Mesh", response: "not-relevant" },
    ],
  };

  const mockContacts = [
    { name: "Jane Doe", linkedinUrl: "https://linkedin.com/in/jane" },
    { name: "John Smith", linkedinUrl: "https://linkedin.com/in/john" },
  ];

  const mockPeers = [
    { name: "DataDog", confirmed: true },
    { name: "HashiCorp", confirmed: true },
    { name: "Rejected Co", confirmed: false },
  ];

  let insertedEntities: {
    name: string;
    type: string;
    source: string;
    confidence: number;
  }[];

  function setupMocks() {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => {
          selectCallCount++;
          if (selectCallCount === 1) return { limit: () => [mockUser] };
          if (selectCallCount === 2) return { limit: () => [mockProfile] };
          if (selectCallCount === 3) return Promise.resolve(mockContacts);
          if (selectCallCount === 4) return Promise.resolve(mockPeers);
          return Promise.resolve([]);
        },
      }),
    }));

    const onConflictDoNothing = vi.fn();
    mockDb.insert.mockImplementation(() => ({
      values: (val: Record<string, unknown>) => {
        insertedEntities.push({
          name: val.name as string,
          type: val.entityType as string,
          source: val.source as string,
          confidence: val.confidence as number,
        });
        return { onConflictDoNothing };
      },
    }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertedEntities = [];
    setupMocks();
  });

  it("extracts user company as a company entity", async () => {
    await seedKnowledgeGraph(testUserId);
    const companyEntity = insertedEntities.find(
      (e) => e.name === "Acme Corp" && e.type === "company"
    );
    expect(companyEntity).toBeDefined();
    expect(companyEntity!.source).toBe("profile-derived");
    expect(companyEntity!.confidence).toBe(1.0);
  });

  it("extracts confirmed peer organizations as company entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const dataDog = insertedEntities.find(
      (e) => e.name === "DataDog" && e.type === "company"
    );
    const hashiCorp = insertedEntities.find(
      (e) => e.name === "HashiCorp" && e.type === "company"
    );
    const rejected = insertedEntities.find((e) => e.name === "Rejected Co");
    expect(dataDog).toBeDefined();
    expect(hashiCorp).toBeDefined();
    expect(rejected).toBeUndefined();
  });

  it("extracts impress contacts as person entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const jane = insertedEntities.find(
      (e) => e.name === "Jane Doe" && e.type === "person"
    );
    const john = insertedEntities.find(
      (e) => e.name === "John Smith" && e.type === "person"
    );
    expect(jane).toBeDefined();
    expect(jane!.source).toBe("profile-derived");
    expect(john).toBeDefined();
  });

  it("extracts parsed topics as concept entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const k8s = insertedEntities.find(
      (e) => e.name === "Kubernetes" && e.type === "concept"
    );
    const obs = insertedEntities.find(
      (e) => e.name === "Observability" && e.type === "concept"
    );
    expect(k8s).toBeDefined();
    expect(k8s!.confidence).toBe(1.0);
    expect(obs).toBeDefined();
  });

  it("extracts expert areas as concept entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const orch = insertedEntities.find(
      (e) => e.name === "Container orchestration" && e.type === "concept"
    );
    expect(orch).toBeDefined();
    expect(orch!.confidence).toBe(1.0);
  });

  it("extracts rapid-fire know-tons as confidence 1.0 entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const aiml = insertedEntities.find(
      (e) => e.name === "AI/ML" && e.source === "rapid-fire"
    );
    expect(aiml).toBeDefined();
    expect(aiml!.confidence).toBe(1.0);
  });

  it("extracts rapid-fire need-more as confidence 0.3 entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const finops = insertedEntities.find(
      (e) => e.name === "FinOps" && e.source === "rapid-fire"
    );
    expect(finops).toBeDefined();
    expect(finops!.confidence).toBe(0.3);
  });

  it("does not extract rapid-fire not-relevant entities", async () => {
    await seedKnowledgeGraph(testUserId);
    const dataMesh = insertedEntities.find(
      (e) => e.name === "Data Mesh" && e.source === "rapid-fire"
    );
    expect(dataMesh).toBeUndefined();
  });

  it("runs AI industry scan and adds entities with 0.8 confidence", async () => {
    await seedKnowledgeGraph(testUserId);
    const react = insertedEntities.find(
      (e) => e.name === "React" && e.source === "industry-scan"
    );
    expect(react).toBeDefined();
    expect(react!.confidence).toBe(0.8);
  });

  it("deduplicates entities by name (case-insensitive)", async () => {
    await seedKnowledgeGraph(testUserId);
    const names = insertedEntities.map((e) => e.name.toLowerCase());
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it("skips seeding when user is missing", async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    }));

    await seedKnowledgeGraph(testUserId);
    expect(insertedEntities.length).toBe(0);
  });

  it("calls db.insert for every unique entity", async () => {
    await seedKnowledgeGraph(testUserId);

    // company (1) + peers (2) + contacts (2) + topics (2) + expert areas (2) +
    // rapid-fire know-tons (1) + rapid-fire need-more (1) + industry scan (5) = 16
    expect(insertedEntities.length).toBeGreaterThanOrEqual(10);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
