import { type Page, type Route } from "@playwright/test";

/**
 * Mock the LinkedIn enrichment API to avoid hitting PeopleDatalabs in tests.
 */
export async function mockLinkedInEnrichment(page: Page) {
  await page.route("**/api/onboarding/linkedin", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enriched: {
          name: "Test User",
          title: "VP of Engineering",
          company: "Acme Corp",
          photoUrl: "https://api.dicebear.com/9.x/initials/svg?seed=TU",
          linkedinUrl: "https://www.linkedin.com/in/test-user-e2e",
          industry: "Technology",
          location: "San Francisco, CA",
          companyDomain: "acme.com",
          companySize: "51-200",
          companyIndustry: "Software",
        },
      }),
    });
  });
}

/**
 * Mock the conversation transcript parsing (avoid LLM calls).
 */
export async function mockConversationParsing(page: Page) {
  await page.route("**/api/onboarding/conversation", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

/**
 * Mock the rapid-fire topics endpoint.
 */
export async function mockRapidFire(page: Page) {
  await page.route("**/api/onboarding/rapid-fire", async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ready: true,
          topics: [
            { topic: "AI/ML Infrastructure", context: "Emerging compute paradigms for model training" },
            { topic: "Edge Computing", context: "Distributed processing at the network edge" },
            { topic: "Zero Trust Security", context: "Identity-first security architecture" },
            { topic: "Platform Engineering", context: "Internal developer platforms and tooling" },
            { topic: "FinOps", context: "Cloud cost optimization discipline" },
            { topic: "Kubernetes Operators", context: "Custom resource controllers for K8s" },
            { topic: "Service Mesh", context: "Microservices networking layer" },
            { topic: "Data Mesh", context: "Decentralized data architecture" },
          ],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
  });
}

/**
 * Mock the impress list endpoint (LinkedIn enrichment for contacts).
 */
export async function mockImpressList(page: Page) {
  await page.route("**/api/onboarding/impress", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contacts: [
          {
            name: "Jane Doe",
            photoUrl: "https://api.dicebear.com/9.x/initials/svg?seed=JD",
          },
          {
            name: "John Smith",
            photoUrl: "https://api.dicebear.com/9.x/initials/svg?seed=JS",
          },
        ],
      }),
    });
  });
}

/**
 * Mock the peer review endpoint.
 */
export async function mockPeerReview(page: Page) {
  await page.route("**/api/onboarding/peers*", async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          peers: [
            { name: "DataDog", domain: "datadoghq.com", description: "Cloud monitoring platform", entityType: "company" },
            { name: "HashiCorp", domain: "hashicorp.com", description: "Infrastructure automation", entityType: "company" },
            { name: "The New Stack", domain: "thenewstack.io", description: "DevOps news", entityType: "publication" },
            { name: "KubeCon", domain: "events.linuxfoundation.org", description: "Kubernetes conference", entityType: "conference" },
            { name: "CNCF", domain: "cncf.io", description: "Cloud native computing foundation", entityType: "research-group" },
          ],
          ready: true,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
  });
}

/**
 * Mock the delivery preferences endpoint.
 */
export async function mockDelivery(page: Page) {
  await page.route("**/api/onboarding/delivery", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

/**
 * Mock the onboarding complete endpoint (avoid triggering real pipeline).
 */
export async function mockOnboardingComplete(page: Page) {
  await page.route("**/api/onboarding/complete", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, briefingId: "mock-briefing-001" }),
    });
  });
}

/**
 * Mock the briefing latest endpoint to return a fake briefing.
 */
export async function mockBriefingLatest(page: Page) {
  await page.route("**/api/briefings/latest", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        briefing: {
        id: "mock-briefing-001",
        generatedAt: new Date().toISOString(),
        items: [
          {
            id: "item-1",
            reason: "Matches your focus on AI infrastructure",
            reasonLabel: "AI/ML",
            topic: "GPU Supply Chain Shifts",
            content: "NVIDIA announced new H200 allocation priorities for enterprise customers, affecting cloud providers' capacity planning for 2026.",
            sourceUrl: "https://example.com/nvidia-h200",
            sourceLabel: "Reuters",
            attribution: "Relevant to your infrastructure scaling initiatives.",
          },
          {
            id: "item-2",
            reason: "Peer company activity",
            reasonLabel: "Competitive",
            topic: "DataDog Acquires Security Startup",
            content: "DataDog — on your peer radar — acquired CloudSecure for $340M, signaling deeper push into security observability.",
            sourceUrl: "https://example.com/datadog-acquisition",
            sourceLabel: "TechCrunch",
            attribution: "DataDog is on your peer list.",
          },
          {
            id: "item-3",
            reason: "Knowledge gap: regulatory shifts",
            reasonLabel: "Regulatory",
            topic: "EU AI Act Enforcement Timeline",
            content: "The EU published its enforcement roadmap for the AI Act, with first compliance deadlines hitting Q3 2026 for high-risk systems.",
            sourceUrl: "https://example.com/eu-ai-act",
            sourceLabel: "Financial Times",
            attribution: "You flagged AI regulation as a knowledge gap.",
          },
        ],
        },
      }),
    });
  });
}

/**
 * Mock the feedback deep-dive endpoint.
 */
export async function mockFeedbackDeepDive(page: Page) {
  await page.route("**/api/feedback/deep-dive", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        expanded: "NVIDIA's H200 allocation changes reflect a broader strategic shift toward enterprise-first distribution. This impacts hyperscalers' ability to offer spot GPU instances and could drive up costs for smaller AI startups by 15-25% in the next quarter.",
      }),
    });
  });
}

/**
 * Mock the feedback tune endpoint.
 */
export async function mockFeedbackTune(page: Page) {
  await page.route("**/api/feedback/tune", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

/**
 * Mock the feedback not-novel endpoint.
 */
export async function mockFeedbackNotNovel(page: Page) {
  await page.route("**/api/feedback/not-novel", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

/**
 * Mock the pipeline status endpoint.
 */
export async function mockPipelineStatus(page: Page) {
  await page.route("**/api/pipeline/status", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ running: false }),
    });
  });
}

/**
 * Mock the user status endpoint.
 */
export async function mockUserStatus(page: Page, status: "not_started" | "in_progress" | "completed" = "completed") {
  await page.route("**/api/user/status", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ onboardingStatus: status }),
    });
  });
}

/**
 * Mock the newsletter suggestions endpoint.
 */
export async function mockNewsletterSuggestions(page: Page) {
  await page.route("**/api/newsletters/suggestions*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        newsletters: [
          { id: "nl-1", name: "TLDR", description: "Daily tech newsletter", websiteUrl: "https://tldr.tech" },
          { id: "nl-2", name: "Morning Brew", description: "Business news", websiteUrl: "https://morningbrew.com" },
        ],
      }),
    });
  });

  await page.route("**/api/newsletters/my*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ subscriptions: [] }),
    });
  });
}

/**
 * Mock the user profile endpoint to return onboarding data on the settings page.
 */
export async function mockUserProfile(page: Page) {
  await page.route("**/api/user/profile", async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        title: "VP of Engineering",
        company: "Acme Corp",
        linkedinUrl: "https://www.linkedin.com/in/test-user-e2e",
        linkedinPhotoUrl: "https://api.dicebear.com/9.x/initials/svg?seed=TU",
        onboardingStatus: "completed",
        transcript:
          "I manage a platform engineering team at a mid-size SaaS company. " +
          "Most of my day goes to architecture reviews and hiring. " +
          "I'm deep in a Kubernetes migration and trying to figure out our observability strategy.",
        conversationInputMethod: "text",
        topics: ["Kubernetes", "Observability", "Platform Engineering"],
        initiatives: ["Kubernetes migration", "Observability strategy"],
        concerns: ["Hiring pipeline", "Architecture complexity"],
        knowledgeGaps: ["eBPF", "OpenTelemetry best practices"],
        expertAreas: ["Container orchestration", "CI/CD pipelines"],
        weakAreas: ["GPU infrastructure", "ML model serving"],
        rapidFireClassifications: [
          { topic: "AI/ML Infrastructure", context: "Emerging compute paradigms", response: "need-more" },
          { topic: "Edge Computing", context: "Distributed processing", response: "not-relevant" },
          { topic: "Zero Trust Security", context: "Identity-first security", response: "know-tons" },
          { topic: "Platform Engineering", context: "Internal developer platforms", response: "know-tons" },
          { topic: "FinOps", context: "Cloud cost optimization", response: "need-more" },
          { topic: "Kubernetes Operators", context: "Custom resource controllers", response: "know-tons" },
          { topic: "Service Mesh", context: "Microservices networking", response: "need-more" },
          { topic: "Data Mesh", context: "Decentralized data architecture", response: "not-relevant" },
        ],
        deliveryChannel: "email",
        deliveryTime: "07:00",
        deliveryTimezone: "America/New_York",
        impressContacts: [
          {
            id: "contact-1",
            name: "Jane Doe",
            title: "CTO",
            company: "BigCorp",
            linkedinUrl: "https://www.linkedin.com/in/jane-doe",
            photoUrl: "https://api.dicebear.com/9.x/initials/svg?seed=JD",
          },
        ],
        peerOrganizations: [
          { id: "peer-1", name: "DataDog", domain: "datadoghq.com", description: "Cloud monitoring platform", entityType: "company", confirmed: true },
          { id: "peer-2", name: "HashiCorp", domain: "hashicorp.com", description: "Infrastructure automation", entityType: "company", confirmed: true },
          { id: "peer-3", name: "The New Stack", domain: "thenewstack.io", description: "DevOps news", entityType: "publication", confirmed: true },
        ],
        profileUpdatedAt: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Apply all mocks needed for the full onboarding flow.
 */
export async function mockFullOnboarding(page: Page) {
  await mockLinkedInEnrichment(page);
  await mockConversationParsing(page);
  await mockRapidFire(page);
  await mockImpressList(page);
  await mockPeerReview(page);
  await mockDelivery(page);
  await mockOnboardingComplete(page);
  await mockNewsletterSuggestions(page);
}

/**
 * Apply all mocks needed for the briefing page.
 */
export async function mockFullBriefing(page: Page) {
  await mockBriefingLatest(page);
  await mockFeedbackDeepDive(page);
  await mockFeedbackTune(page);
  await mockFeedbackNotNovel(page);
  await mockPipelineStatus(page);
}
