/**
 * Unit test for runPipeline — mocks DB, LLM, scoring agent, and ingestion
 * so we can verify the compose step produces real briefing items.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createMockDb, createMockLlmResponse, FIXTURES } from "../../__tests__/helpers/mocks";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockDb = createMockDb();
vi.mock("../db", () => ({ db: mockDb }));

vi.mock("../schema", () => ({
  users: "users",
  userProfiles: "user_profiles",
  briefings: "briefings",
  signals: "signals",
  signalProvenance: "signal_provenance",
}));

const mockChat = vi.fn();
vi.mock("../llm", () => ({
  chat: (...args: unknown[]) => mockChat(...args),
}));

const mockRunScoringAgent = vi.fn();
vi.mock("../scoring-agent", () => ({
  runScoringAgent: (...args: unknown[]) => mockRunScoringAgent(...args),
  DEFAULT_AGENT_CONFIG: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxToolRounds: 10,
    targetSelections: 5,
    candidatePoolSize: 50,
  },
}));

vi.mock("../pipeline-status", () => ({
  updatePipelineStatus: vi.fn(),
}));

vi.mock("../news-ingestion", () => ({
  deriveNewsQueries: vi.fn().mockResolvedValue(undefined),
  refreshQueriesForUser: vi.fn().mockResolvedValue(undefined),
  pollNewsQueries: vi.fn().mockResolvedValue({
    queriesPolled: 0,
    articlesFound: 0,
    signals: [],
    errorsEncounted: 0,
  }),
}));

vi.mock("../syndication", () => ({
  deriveFeedsForUser: vi.fn().mockResolvedValue(0),
  pollSyndicationFeeds: vi.fn().mockResolvedValue({
    feedsPolled: 0,
    newItems: 0,
    errors: 0,
  }),
}));

vi.mock("../ai-research", () => ({
  runAiResearch: vi.fn().mockResolvedValue([]),
}));

vi.mock("../briefing-entity-extraction", () => ({
  extractAndSeedEntities: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../delivery", () => ({
  sendBriefingEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const COMPOSED_ITEMS = [
  {
    id: "aaa-111",
    reason: "Relates to your initiative: digital transformation",
    reasonLabel: "Initiative Match",
    topic: "Parametric Insurance Adoption",
    content:
      "Parametric insurance, an area you flagged as a knowledge gap, is seeing rapid adoption among major reinsurers for climate risk.",
    sourceUrl: "https://example.com/1",
    sourceLabel: "Reuters",
    attribution: "Relates to your parsed knowledge gap: parametric insurance",
  },
  {
    id: "bbb-222",
    reason: "Matches your concern: regulatory compliance",
    reasonLabel: "Concern Match",
    topic: "ESG Reporting Requirements",
    content:
      "SEC now mandates enhanced climate disclosure for public companies, directly affecting regulatory compliance workflows.",
    sourceUrl: "https://example.com/2",
    sourceLabel: "Bloomberg",
    attribution: "Affects your concern: regulatory compliance",
  },
];

function scoringResult(signalIndices: number[]) {
  return {
    userId: FIXTURES.userId,
    selections: signalIndices.map((idx) => ({
      signalIndex: idx,
      reason: idx === 0
        ? "Relates to your initiative: digital transformation"
        : "Matches your concern: regulatory compliance",
      reasonLabel: idx === 0 ? "Initiative Match" : "Concern Match",
      confidence: 0.9,
      noveltyAssessment: "Novel",
      attribution: idx === 0
        ? "Relates to your parsed knowledge gap: parametric insurance"
        : "Affects your concern: regulatory compliance",
      toolsUsed: ["check_knowledge_graph" as const],
    })),
    reasoning: "Selected based on profile match",
    toolCallLog: [
      { tool: "check_knowledge_graph" as const, args: {}, summary: "Checked knowledge graph" },
    ],
    modelUsed: "gpt-4o-mini",
    promptTokens: 500,
    completionTokens: 200,
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Wire up mockDb.limit so that sequential calls to the DB return
 * the user row, then the profile row, then provenance rows, then signal rows,
 * then allSignalRows, and finally the inserted briefing.
 */
function setupDbFlow(opts?: { noSignals?: boolean }) {
  const limitMock = mockDb.limit as Mock;
  let callCount = 0;
  limitMock.mockImplementation((n?: number) => {
    callCount++;
    switch (callCount) {
      case 1: // users.select ... .limit(1)
        return Promise.resolve([FIXTURES.user]);
      case 2: // userProfiles.select ... .limit(1)
        return Promise.resolve([{ ...FIXTURES.profile, deliveryChannel: "web" }]);
      case 3: // signalRows ... .limit(200)
        if (opts?.noSignals) return Promise.resolve([]);
        return Promise.resolve(
          FIXTURES.signals.map((s) => ({
            ...s,
            metadata: { source_label: s.sourceLabel },
            layer: "news",
            ingestedAt: new Date(),
            summary: s.summary,
          }))
        );
      case 4: // allSignalRows ... .limit(500)
        if (opts?.noSignals) return Promise.resolve([]);
        return Promise.resolve(
          FIXTURES.signals.map((_, i) => ({
            id: `signal-${i}`,
            ingestedAt: new Date(),
            layer: "news",
          }))
        );
      default:
        return Promise.resolve([]);
    }
  });

  // signalProvenance select (no .limit — uses .where chain directly)
  (mockDb.where as Mock).mockImplementation(() => mockDb);

  // For provenance rows (no limit, resolves via the chain's promise)
  // The chain ends at .where for provenance; we handle it via limit above
  // since the pipeline calls .from().where() for provenance (no limit call).
  // We need a different approach: mock the chain to be thenable for provenance.

  // Actually, looking at the pipeline code:
  // - provenance: db.select().from().where()  — no .limit()
  // - We need .where() to return something thenable when provenance is queried
  // Let's make .where() return a thenable that resolves with provenance rows
  // but also still chains for .orderBy / .limit calls.

  const provenanceRows = opts?.noSignals
    ? []
    : FIXTURES.signals.map((_, i) => ({ signalId: `signal-${i}` }));

  // Make mockDb act as both a promise (for provenance) and a chain
  // by adding .then to the mock chain
  const originalWhere = mockDb.where;
  let whereCallCount = 0;
  (mockDb.where as Mock).mockImplementation((...args: unknown[]) => {
    whereCallCount++;
    if (whereCallCount === 3) {
      // 3rd where call is the provenance query (after user, profile)
      // Actually provenance is the first .where after profile's .where
      // Let me re-count: user(.where), profile(.where), provenance(.where)
      // But each chain reuses the same mock. We need to track based on context.
    }
    return mockDb;
  });

  // Better approach: make the mock chain thenable
  // When pipeline does `await db.select().from().where()` (provenance),
  // the chain needs to resolve. Let's add a .then method.
  (mockDb as unknown as Record<string, unknown>).then = undefined;

  // Actually the simplest approach: since provenance uses no .limit(),
  // the await on the chain object itself needs to work.
  // Let's make it thenable at the right time.
  // But that's complex with a shared mock chain.

  // Simplest: override the mock to make ALL terminal awaits on the chain
  // resolve with provenance rows by default, and .limit() returns specific values.
  // The chain already has .limit returning promises. For provenance (no .limit),
  // we need the chain itself to be awaitable.

  // Let's use a proxy-based approach: when .where() is called, return
  // an object that's thenable (resolves with provenance) but also chains.
  const chainWithThen = {
    ...mockDb,
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(provenanceRows).then(resolve, reject);
    },
    orderBy: vi.fn().mockReturnValue(mockDb),
  };

  // Track which "from" table we're hitting
  let selectCallCount = 0;
  (mockDb.select as Mock).mockImplementation(() => {
    selectCallCount++;
    return mockDb;
  });
  (mockDb.from as Mock).mockImplementation(() => {
    return mockDb;
  });
  (mockDb.where as Mock).mockImplementation(() => {
    // Return thenable chain for provenance (3rd where in the flow)
    // Actually let's just always return the thenable chain — .limit overrides
    // resolution for queries that use it.
    return chainWithThen;
  });

  // Insert chain for saving the briefing
  const briefingId = FIXTURES.briefingId;
  (mockDb.insert as Mock).mockReturnValue(mockDb);
  (mockDb.values as Mock).mockReturnValue(mockDb);
  (mockDb.returning as Mock).mockResolvedValue([{ id: briefingId }]);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runPipeline → compose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("composes briefing items from LLM and saves to DB", async () => {
    setupDbFlow();

    mockRunScoringAgent.mockResolvedValue(scoringResult([0, 1]));

    mockChat.mockResolvedValue(
      createMockLlmResponse(JSON.stringify(COMPOSED_ITEMS))
    );

    const { runPipeline } = await import("../pipeline");
    const briefingId = await runPipeline(FIXTURES.userId);

    expect(briefingId).toBe(FIXTURES.briefingId);

    // Verify chat was called for composition
    expect(mockChat).toHaveBeenCalledTimes(1);
    const [messages, opts] = mockChat.mock.calls[0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("briefing items");
    expect(messages[1].role).toBe("user");
    expect(opts.model).toBe("gpt-4o-mini");

    // Verify the briefing was inserted
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalled();

    const insertedValues = (mockDb.values as Mock).mock.calls[0][0];
    expect(insertedValues.userId).toBe(FIXTURES.userId);
    expect(insertedValues.items).toEqual(COMPOSED_ITEMS);
    expect(insertedValues.modelUsed).toBe("gpt-4o-mini");
    expect(insertedValues.promptTokens).toBeGreaterThan(0);
    expect(insertedValues.completionTokens).toBeGreaterThan(0);
  });

  it("each composed item has required fields", async () => {
    setupDbFlow();
    mockRunScoringAgent.mockResolvedValue(scoringResult([0, 1]));
    mockChat.mockResolvedValue(
      createMockLlmResponse(JSON.stringify(COMPOSED_ITEMS))
    );

    const { runPipeline } = await import("../pipeline");
    await runPipeline(FIXTURES.userId);

    const insertedValues = (mockDb.values as Mock).mock.calls[0][0];
    for (const item of insertedValues.items) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("reason");
      expect(item).toHaveProperty("reasonLabel");
      expect(item).toHaveProperty("topic");
      expect(item).toHaveProperty("content");
      expect(item.content.length).toBeGreaterThan(0);
      expect(item).toHaveProperty("sourceUrl");
      expect(item).toHaveProperty("sourceLabel");
    }
  });

  it("handles LLM response wrapped in code fences", async () => {
    setupDbFlow();
    mockRunScoringAgent.mockResolvedValue(scoringResult([0]));

    const fencedResponse = "```json\n" + JSON.stringify([COMPOSED_ITEMS[0]]) + "\n```";
    mockChat.mockResolvedValue(createMockLlmResponse(fencedResponse));

    const { runPipeline } = await import("../pipeline");
    const briefingId = await runPipeline(FIXTURES.userId);

    expect(briefingId).toBe(FIXTURES.briefingId);
    const insertedValues = (mockDb.values as Mock).mock.calls[0][0];
    expect(insertedValues.items).toHaveLength(1);
    expect(insertedValues.items[0].topic).toBe("Parametric Insurance Adoption");
  });

  it("falls back to raw signals when LLM composition fails", async () => {
    setupDbFlow();
    mockRunScoringAgent.mockResolvedValue(scoringResult([0, 1]));
    mockChat.mockRejectedValue(new Error("LLM unavailable"));

    const { runPipeline } = await import("../pipeline");
    const briefingId = await runPipeline(FIXTURES.userId);

    expect(briefingId).toBe(FIXTURES.briefingId);

    const insertedValues = (mockDb.values as Mock).mock.calls[0][0];
    expect(insertedValues.items).toHaveLength(2);
    // Fallback uses signal title as topic
    expect(insertedValues.items[0].topic).toBe(FIXTURES.signals[0].title);
    expect(insertedValues.items[0].content).toBe(FIXTURES.signals[0].summary);
    expect(insertedValues.items[0].sourceLabel).toBe(FIXTURES.signals[0].sourceLabel);
  });

  it("returns null when no candidate signals exist", async () => {
    setupDbFlow({ noSignals: true });

    const { runPipeline } = await import("../pipeline");
    const briefingId = await runPipeline(FIXTURES.userId);

    expect(briefingId).toBeNull();
    expect(mockRunScoringAgent).not.toHaveBeenCalled();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when scoring agent returns no selections", async () => {
    setupDbFlow();
    mockRunScoringAgent.mockResolvedValue({
      ...scoringResult([]),
      selections: [],
    });

    const { runPipeline } = await import("../pipeline");
    const briefingId = await runPipeline(FIXTURES.userId);

    expect(briefingId).toBe("skipped");
    expect(mockChat).not.toHaveBeenCalled();
  });

  it("returns null when user/profile not found", async () => {
    const limitMock = mockDb.limit as Mock;
    limitMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const { runPipeline } = await import("../pipeline");
    const briefingId = await runPipeline(FIXTURES.userId);

    expect(briefingId).toBeNull();
  });

  it("aggregates token counts from scoring + composition", async () => {
    setupDbFlow();
    const scoring = scoringResult([0]);
    scoring.promptTokens = 300;
    scoring.completionTokens = 150;
    mockRunScoringAgent.mockResolvedValue(scoring);

    mockChat.mockResolvedValue({
      content: JSON.stringify([COMPOSED_ITEMS[0]]),
      promptTokens: 200,
      completionTokens: 100,
      model: "gpt-4o-mini",
      provider: "openai",
    });

    const { runPipeline } = await import("../pipeline");
    await runPipeline(FIXTURES.userId);

    const insertedValues = (mockDb.values as Mock).mock.calls[0][0];
    expect(insertedValues.promptTokens).toBe(500);     // 300 + 200
    expect(insertedValues.completionTokens).toBe(250);  // 150 + 100
  });
});
