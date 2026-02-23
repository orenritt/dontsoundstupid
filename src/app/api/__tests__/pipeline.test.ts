import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockRunPipeline = vi.fn();
vi.mock("@/lib/pipeline", () => ({
  runPipeline: (...args: unknown[]) => mockRunPipeline(...args),
}));

const mockUpdateStatus = vi.fn();
const mockGetStatus = vi.fn();
vi.mock("@/lib/pipeline-status", () => ({
  updatePipelineStatus: (...args: unknown[]) => mockUpdateStatus(...args),
  getPipelineStatus: (...args: unknown[]) => mockGetStatus(...args),
}));

describe("POST /api/pipeline/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockRunPipeline.mockResolvedValue("briefing-id");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("../pipeline/trigger/route");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns started:true and kicks off pipeline", async () => {
    const { POST } = await import("../pipeline/trigger/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.started).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith("user-123", "starting");
  });
});

describe("GET /api/pipeline/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("../pipeline/status/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns running:false when no pipeline status exists", async () => {
    mockGetStatus.mockReturnValue(null);

    const { GET } = await import("../pipeline/status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.running).toBe(false);
  });

  it("returns running:true for active pipeline stage", async () => {
    mockGetStatus.mockReturnValue({
      stage: "scoring",
      message: "Scoring and selecting signals...",
      startedAt: Date.now() - 5000,
      updatedAt: Date.now(),
    });

    const { GET } = await import("../pipeline/status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.running).toBe(true);
    expect(body.stage).toBe("scoring");
    expect(body.message).toBe("Scoring and selecting signals...");
    expect(body.elapsedMs).toBeGreaterThan(0);
  });

  it("returns running:false for completed pipeline", async () => {
    mockGetStatus.mockReturnValue({
      stage: "done",
      message: "Briefing ready",
      startedAt: Date.now() - 30000,
      updatedAt: Date.now(),
      briefingId: "b-456",
    });

    const { GET } = await import("../pipeline/status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.running).toBe(false);
    expect(body.briefingId).toBe("b-456");
  });

  it("returns running:false for failed pipeline", async () => {
    mockGetStatus.mockReturnValue({
      stage: "failed",
      message: "Pipeline failed",
      startedAt: Date.now() - 10000,
      updatedAt: Date.now(),
      error: "Out of tokens",
    });

    const { GET } = await import("../pipeline/status/route");
    const res = await GET();
    const body = await res.json();
    expect(body.running).toBe(false);
    expect(body.error).toBe("Out of tokens");
  });
});
