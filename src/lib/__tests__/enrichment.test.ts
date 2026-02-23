import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
const mockChat = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/llm", () => ({
  chat: (...args: unknown[]) => mockChat(...args),
}));

describe("enrichLinkedinProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PDL_API_KEY = "test-pdl-key";
  });

  it("enriches a LinkedIn profile via PDL API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            full_name: "Jane Doe",
            job_title: "VP of Engineering",
            job_company_name: "Acme Corp",
            industry: "Technology",
            location_name: "San Francisco, CA",
            job_company_website: "acme.com",
            job_company_size: "51-200",
            job_company_industry: "Software",
          },
        }),
    });

    const { enrichLinkedinProfile } = await import("../enrichment");
    const result = await enrichLinkedinProfile(
      "https://www.linkedin.com/in/jane-doe"
    );

    expect(result.name).toBe("Jane Doe");
    expect(result.title).toBe("VP of Engineering");
    expect(result.company).toBe("Acme Corp");
    expect(result.industry).toBe("Technology");
    expect(result.photoUrl).toContain("dicebear");
    expect(result.linkedinUrl).toBe("https://www.linkedin.com/in/jane-doe");

    // Verify PDL was called with the right API key header
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("peopledatalabs.com");
    expect(opts.headers["X-Api-Key"]).toBe("test-pdl-key");
  });

  it("returns fallback when PDL returns 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { enrichLinkedinProfile } = await import("../enrichment");
    const result = await enrichLinkedinProfile(
      "https://www.linkedin.com/in/unknown-user"
    );

    expect(result.name).toBeTruthy();
    expect(result.photoUrl).toContain("dicebear");
    expect(result.title).toBe("");
    expect(result.company).toBe("");
  });

  it("returns fallback when PDL API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    const { enrichLinkedinProfile } = await import("../enrichment");
    const result = await enrichLinkedinProfile(
      "https://www.linkedin.com/in/server-error-user"
    );

    expect(result.name).toBeTruthy();
    expect(result.linkedinUrl).toBe(
      "https://www.linkedin.com/in/server-error-user"
    );
  });

  it("generates name from LinkedIn slug when PDL returns no name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });

    const { enrichLinkedinProfile } = await import("../enrichment");
    const result = await enrichLinkedinProfile(
      "https://www.linkedin.com/in/john-smith-xyz"
    );

    expect(result.name).toBe("John Smith Xyz");
  });

  it("throws when PDL_API_KEY is not set", async () => {
    delete process.env.PDL_API_KEY;

    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    vi.doMock("@/lib/llm", () => ({ chat: mockChat }));

    const { enrichLinkedinProfile } = await import("../enrichment");
    await expect(
      enrichLinkedinProfile("https://www.linkedin.com/in/test")
    ).rejects.toThrow("PDL_API_KEY");
  });
});

describe("enrichCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PDL_API_KEY = "test-pdl-key";
  });

  it("enriches a company by domain", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          name: "Acme Corp",
          website: "acme.com",
          industry: "Software",
          size: "51-200",
          summary: "Leading software company",
          location: { name: "San Francisco, CA" },
          linkedin_url: "linkedin.com/company/acme",
          founded: 2010,
          employee_count: 150,
          tags: ["saas", "enterprise"],
        }),
    });

    const { enrichCompany } = await import("../enrichment");
    const result = await enrichCompany({ domain: "acme.com" });

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Acme Corp");
    expect(result!.domain).toBe("acme.com");
    expect(result!.industry).toBe("Software");
    expect(result!.founded).toBe(2010);
  });

  it("returns null when company not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { enrichCompany } = await import("../enrichment");
    const result = await enrichCompany({ domain: "nonexistent.com" });
    expect(result).toBeNull();
  });

  it("returns null when no identifier provided", async () => {
    const { enrichCompany } = await import("../enrichment");
    const result = await enrichCompany({});
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("derivePeerOrganizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives peer organizations via LLM", async () => {
    mockChat.mockResolvedValueOnce({
      content: JSON.stringify([
        {
          name: "DataDog",
          domain: "datadoghq.com",
          description: "Cloud monitoring",
          entityType: "company",
        },
        {
          name: "The New Stack",
          domain: "thenewstack.io",
          description: "DevOps news",
          entityType: "publication",
        },
        {
          name: "KubeCon",
          domain: "events.linuxfoundation.org",
          description: "Kubernetes conference",
          entityType: "conference",
        },
      ]),
    });

    const { derivePeerOrganizations } = await import("../enrichment");
    const result = await derivePeerOrganizations(
      "Acme Corp",
      "Technology",
      "VP of Engineering",
      "51-200"
    );

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("DataDog");
    expect(result[0].entityType).toBe("company");
    expect(result[1].entityType).toBe("publication");
    expect(result[2].entityType).toBe("conference");

    // Verify LLM was called with context about the user
    expect(mockChat).toHaveBeenCalledOnce();
    const [messages] = mockChat.mock.calls[0];
    const userMessage = messages.find(
      (m: { role: string }) => m.role === "user"
    );
    expect(userMessage.content).toContain("Acme Corp");
    expect(userMessage.content).toContain("Technology");
    expect(userMessage.content).toContain("VP of Engineering");
  });

  it("includes profile context in the prompt when provided", async () => {
    mockChat.mockResolvedValueOnce({
      content: "[]",
    });

    const { derivePeerOrganizations } = await import("../enrichment");
    await derivePeerOrganizations(
      "Acme Corp",
      "Technology",
      "CTO",
      "200-500",
      {
        topics: ["AI infrastructure", "DevOps"],
        initiatives: ["Cloud migration"],
        concerns: ["Security posture"],
        knowledgeGaps: ["FinOps"],
      }
    );

    const [messages] = mockChat.mock.calls[0];
    const userMessage = messages.find(
      (m: { role: string }) => m.role === "user"
    );
    expect(userMessage.content).toContain("AI infrastructure");
    expect(userMessage.content).toContain("Cloud migration");
    expect(userMessage.content).toContain("Security posture");
    expect(userMessage.content).toContain("FinOps");
  });

  it("handles LLM returning invalid JSON", async () => {
    mockChat.mockResolvedValueOnce({
      content: "I'm sorry, I can't generate that list right now.",
    });

    const { derivePeerOrganizations } = await import("../enrichment");
    const result = await derivePeerOrganizations(
      "Acme Corp",
      "Technology",
      "VP of Engineering",
      "51-200"
    );

    expect(result).toEqual([]);
  });

  it("handles LLM returning JSON wrapped in markdown fences", async () => {
    mockChat.mockResolvedValueOnce({
      content:
        '```json\n[{"name": "DataDog", "domain": "datadoghq.com", "description": "Monitoring", "entityType": "company"}]\n```',
    });

    const { derivePeerOrganizations } = await import("../enrichment");
    const result = await derivePeerOrganizations(
      "Acme Corp",
      "Technology",
      "VP of Engineering",
      "51-200"
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("DataDog");
  });

  it("normalizes invalid entity types to 'company'", async () => {
    mockChat.mockResolvedValueOnce({
      content: JSON.stringify([
        {
          name: "Acme",
          domain: "acme.com",
          description: "Test",
          entityType: "invalid-type",
        },
        {
          name: "Beta",
          domain: "beta.com",
          description: "Test",
        },
      ]),
    });

    const { derivePeerOrganizations } = await import("../enrichment");
    const result = await derivePeerOrganizations(
      "Test Corp",
      "Tech",
      "CTO",
      "50"
    );

    expect(result[0].entityType).toBe("company");
    expect(result[1].entityType).toBe("company");
  });
});
