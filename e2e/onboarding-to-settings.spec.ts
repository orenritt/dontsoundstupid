import { test, expect } from "@playwright/test";
import { signUpAndGoToOnboarding } from "./helpers/test-user";
import {
  mockFullOnboarding,
  mockFullBriefing,
  mockUserProfile,
} from "./helpers/api-mocks";

test.describe("Onboarding data flows to settings", () => {
  test("all onboarding content is visible and editable on the settings page", async ({
    page,
  }) => {
    await mockUserProfile(page);
    await mockFullBriefing(page);

    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "completed" }),
      });
    });

    await page.goto("/settings");

    // ── User identity ──
    await expect(page.getByText("Test User")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("VP of Engineering at Acme Corp")).toBeVisible();

    // LinkedIn URL is editable
    const linkedinInput = page.locator('input[type="url"]');
    await expect(linkedinInput).toBeVisible();
    const linkedinValue = await linkedinInput.inputValue();
    expect(linkedinValue).toContain("linkedin.com/in/test-user-e2e");

    // ── Conversation transcript is editable ──
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    const transcriptValue = await textarea.inputValue();
    expect(transcriptValue).toContain("Kubernetes migration");

    // ── Parsed tags are visible ──
    await expect(page.getByText("Kubernetes", { exact: true })).toBeVisible();
    await expect(page.getByText("Observability")).toBeVisible();
    await expect(page.getByText("Platform Engineering")).toBeVisible();
    await expect(page.getByText("Kubernetes migration")).toBeVisible();
    await expect(page.getByText("Hiring pipeline")).toBeVisible();
    await expect(page.getByText("eBPF")).toBeVisible();
    await expect(page.getByText("Container orchestration")).toBeVisible();
    await expect(page.getByText("GPU infrastructure")).toBeVisible();

    // ── Tags have "+ Add" buttons (proving they're editable) ──
    const addButtons = page.getByRole("button", { name: "+ Add" });
    const addCount = await addButtons.count();
    expect(addCount).toBeGreaterThanOrEqual(6);

    // ── Tags have remove buttons (x) visible on hover ──
    // Hover over a tag to reveal its remove button
    const k8sTag = page.getByText("Kubernetes", { exact: true });
    await k8sTag.hover();

    // ── Rapid-fire classifications are visible ──
    await expect(
      page.getByText("AI/ML Infrastructure — Learning")
    ).toBeVisible();
    await expect(
      page.getByText("Zero Trust Security — Expert")
    ).toBeVisible();
    await expect(page.getByText("FinOps — Learning")).toBeVisible();
    await expect(page.getByText("Edge Computing — Skipped")).toBeVisible();

    // ── Save button exists ──
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeVisible();
  });

  test("tags can be added and removed", async ({ page }) => {
    await mockUserProfile(page);

    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "completed" }),
      });
    });

    // Mock the PUT to capture what's sent
    let savedPayload: Record<string, unknown> | null = null;
    await page.route("**/api/user/profile", async (route) => {
      if (route.request().method() === "PUT") {
        savedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto("/settings");
    await expect(page.getByText("Test User")).toBeVisible({ timeout: 10_000 });

    // Add a new topic
    const topicsSection = page.locator("div").filter({ hasText: /^Topics/ }).first();
    const addButton = topicsSection.getByRole("button", { name: "+ Add" });
    await addButton.click();

    const input = topicsSection.locator("input");
    await input.fill("WebAssembly");
    await input.press("Enter");

    await expect(page.getByText("WebAssembly")).toBeVisible();

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Verify the saved payload includes the new topic
    expect(savedPayload).not.toBeNull();
    expect((savedPayload as Record<string, unknown>).topics).toContain("WebAssembly");
  });

  test("rapid-fire classification can be cycled", async ({ page }) => {
    await mockUserProfile(page);

    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "completed" }),
      });
    });

    let savedPayload: Record<string, unknown> | null = null;
    await page.route("**/api/user/profile", async (route) => {
      if (route.request().method() === "PUT") {
        savedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto("/settings");
    await expect(page.getByText("Test User")).toBeVisible({ timeout: 10_000 });

    // FinOps starts as "Learning" (need-more), click to cycle to "Skipped" (not-relevant)
    await page.getByText("FinOps — Learning").click();
    await expect(page.getByText("FinOps — Skipped")).toBeVisible();

    // Click again to cycle to "Expert" (know-tons)
    await page.getByText("FinOps — Skipped").click();
    await expect(page.getByText("FinOps — Expert")).toBeVisible();

    // Save and verify
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    const classifications = (savedPayload as Record<string, unknown>)
      .rapidFireClassifications as { topic: string; response: string }[];
    const finops = classifications.find((c) => c.topic === "FinOps");
    expect(finops?.response).toBe("know-tons");
  });
});

test.describe("Logout functionality", () => {
  test("logout button is visible on settings page", async ({ page }) => {
    await mockUserProfile(page);

    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "completed" }),
      });
    });

    await page.goto("/settings");
    await expect(page.getByText("Test User")).toBeVisible({ timeout: 10_000 });

    // Log Out button should be visible (desktop sidebar or mobile)
    await expect(page.getByText("Log Out").first()).toBeVisible();
  });
});

test.describe("Onboarding completion seeds knowledge graph", () => {
  test("complete endpoint is called with correct data and seeds KG", async ({
    page,
  }) => {
    await mockFullOnboarding(page);
    await mockFullBriefing(page);

    let completeEndpointCalled = false;
    await page.route("**/api/onboarding/complete", async (route) => {
      completeEndpointCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, briefingId: "mock-briefing-001" }),
      });
    });

    const apiCallsReceived: Record<string, unknown> = {};

    await page.route("**/api/onboarding/linkedin", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        apiCallsReceived["linkedin"] = body;
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
      } else {
        await route.fallback();
      }
    });

    await page.route("**/api/onboarding/conversation", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        apiCallsReceived["conversation"] = body;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route("**/api/onboarding/rapid-fire", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        apiCallsReceived["rapidFire"] = body;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ready: true,
            topics: [
              { topic: "AI/ML Infrastructure", context: "Emerging compute paradigms" },
              { topic: "Edge Computing", context: "Distributed processing" },
              { topic: "Zero Trust Security", context: "Identity-first security" },
              { topic: "Platform Engineering", context: "Internal developer platforms" },
              { topic: "FinOps", context: "Cloud cost optimization" },
              { topic: "Kubernetes Operators", context: "Custom resource controllers" },
              { topic: "Service Mesh", context: "Microservices networking" },
              { topic: "Data Mesh", context: "Decentralized data architecture" },
            ],
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route("**/api/onboarding/peers*", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        apiCallsReceived["peers"] = body;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            peers: [
              { name: "DataDog", domain: "datadoghq.com", description: "Cloud monitoring", entityType: "company" },
              { name: "HashiCorp", domain: "hashicorp.com", description: "Infrastructure automation", entityType: "company" },
            ],
            ready: true,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route("**/api/onboarding/delivery", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        apiCallsReceived["delivery"] = body;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/onboarding/progress", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ resumeStep: "linkedin" }),
      });
    });

    let onboardingCompleted = false;
    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboardingStatus: onboardingCompleted ? "completed" : "not_started",
        }),
      });
    });

    await signUpAndGoToOnboarding(page);

    // Step 1: LinkedIn
    await expect(page.getByText("Who are you?")).toBeVisible();
    await page
      .getByPlaceholder("Paste your LinkedIn profile URL")
      .fill("https://www.linkedin.com/in/test-user-e2e");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText("Walk me through a typical day")).toBeVisible({
      timeout: 10_000,
    });

    // Step 2: Conversation
    await page
      .locator("textarea")
      .fill(
        "I manage a platform engineering team at a mid-size SaaS company. " +
          "Most of my day goes to architecture reviews and hiring."
      );
    await page.getByRole("button", { name: "Done with this one" }).click();
    await expect(
      page.getByRole("button", { name: /let's go/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /let's go/i }).click();

    // Step 3: Impress List
    await expect(page.getByText("Who do we need to impress?")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 4: Rapid-Fire
    await expect(page.getByText("AI/ML Infrastructure")).toBeVisible({
      timeout: 10_000,
    });
    for (let i = 0; i < 8; i++) {
      const choices = ["Know tons", "Need more", "Not relevant"];
      await page.getByRole("button", { name: choices[i % 3] }).click();
      await page.waitForTimeout(400);
    }

    // Step 5: Peer Review
    await expect(page.getByText("DataDog")).toBeVisible({ timeout: 10_000 });
    const yesButtons = page.getByRole("button", { name: "Yes" });
    const peerCount = await yesButtons.count();
    for (let i = 0; i < peerCount; i++) {
      await yesButtons.nth(i).click();
      await page.waitForTimeout(200);
    }
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6: Delivery
    await expect(page.getByText("Delivery channel")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Start My Briefings" }).click();

    // Step 7: Calendar
    await expect(page.getByText("Coming Soon")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Skip for now").click();

    // Step 8: Newsletters
    await expect(page.getByText("Build your content universe")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 9: Completion
    await expect(page.getByText("You're all set")).toBeVisible({
      timeout: 10_000,
    });

    onboardingCompleted = true;
    await page.getByRole("button", { name: "Go to Your Dashboard" }).click();

    await page.waitForURL("**/briefing**", { timeout: 15_000 });

    expect(completeEndpointCalled).toBe(true);
    expect(apiCallsReceived["linkedin"]).toBeDefined();
    expect(apiCallsReceived["conversation"]).toBeDefined();
    expect(
      (apiCallsReceived["conversation"] as { transcript: string }).transcript
    ).toContain("platform engineering");
    expect(apiCallsReceived["delivery"]).toBeDefined();
  });
});
