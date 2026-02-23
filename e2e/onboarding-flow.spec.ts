import { test, expect } from "@playwright/test";
import { signUpAndGoToOnboarding } from "./helpers/test-user";
import {
  mockFullOnboarding,
  mockFullBriefing,
} from "./helpers/api-mocks";

test.describe("Full onboarding flow", () => {
  test("sign up → all 9 onboarding steps → briefing displayed", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    // Mock all external API calls so tests run without real LLM/enrichment
    await mockFullOnboarding(page);
    await mockFullBriefing(page);

    // Mock the onboarding progress endpoint so it starts at linkedin step
    await page.route("**/api/onboarding/progress", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ resumeStep: "linkedin" }),
      });
    });

    // During onboarding, user status = not_started
    const statusHandler = async (route: import("@playwright/test").Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "not_started" }),
      });
    };
    await page.route("**/api/user/status", statusHandler);

    // ── Step 0: Sign up and get to onboarding ──
    await signUpAndGoToOnboarding(page);

    // ── Step 1: LinkedIn ──
    await expect(page.getByText("Who are you?")).toBeVisible();
    await page
      .getByPlaceholder("Paste your LinkedIn profile URL")
      .fill("https://www.linkedin.com/in/test-user-e2e");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Wait for enrichment response and auto-advance (1.5s timeout in component)
    await expect(page.getByText("Walk me through a typical day")).toBeVisible({
      timeout: 10_000,
    });

    // ── Step 2: Conversation ──
    await page
      .locator("textarea")
      .fill(
        "I manage a platform engineering team at a mid-size SaaS company. " +
          "Most of my day goes to architecture reviews and hiring. " +
          "I'm deep in a Kubernetes migration and trying to figure out our observability strategy."
      );
    await page.getByRole("button", { name: "Done with this one" }).click();

    // Choose to finish after one question
    await expect(
      page.getByRole("button", { name: /let's go/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /let's go/i }).click();

    // ── Step 3: Impress List ──
    await expect(page.getByText("Who do we need to impress?")).toBeVisible({
      timeout: 10_000,
    });

    // Click the first "+" slot to add a contact
    const addButtons = page.locator('button:has-text("+")');
    await addButtons.first().click();

    await page
      .getByPlaceholder("Paste LinkedIn URL")
      .fill("https://www.linkedin.com/in/jane-doe");
    await page.getByRole("button", { name: "Add" }).click();

    // Wait for the contact to appear, then proceed
    await expect(page.getByText("Jane Doe")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // ── Step 4: Rapid-Fire ──
    await expect(page.getByText("AI/ML Infrastructure")).toBeVisible({
      timeout: 10_000,
    });

    // Classify all 8 topics by clicking through them
    const topicCount = 8;
    for (let i = 0; i < topicCount; i++) {
      // Rotate between the three choices
      const choices = ["Know tons", "Need more", "Not relevant"];
      await page
        .getByRole("button", { name: choices[i % 3] })
        .click();
      // Small wait for animation
      await page.waitForTimeout(400);
    }

    // Auto-submits and advances after all classified

    // ── Step 5: Peer Review ──
    await expect(page.getByRole("heading", { name: "DataDog" })).toBeVisible({ timeout: 10_000 });

    // Confirm all peers by clicking "Yes" for each
    const yesButtons = page.getByRole("button", { name: "Yes" });
    const peerCount = await yesButtons.count();
    for (let i = 0; i < peerCount; i++) {
      await yesButtons.nth(i).click();
      await page.waitForTimeout(200);
    }

    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 6: Delivery ──
    await expect(page.getByText("Delivery channel")).toBeVisible({
      timeout: 10_000,
    });

    // Email is selected by default, just submit
    await page
      .getByRole("button", { name: "Start My Briefings" })
      .click();

    // ── Step 7: Calendar ──
    await expect(page.getByText("Coming Soon").first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Skip for now").click();

    // ── Step 8: Newsletters ──
    await expect(page.getByText("Build your content universe")).toBeVisible({
      timeout: 10_000,
    });

    // Verify suggestion cards rendered with correct data
    await expect(page.getByText("TLDR")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Morning Brew")).toBeVisible();
    await expect(
      page.getByText("Covers the infrastructure and platform topics")
    ).toBeVisible();

    // Add a newsletter and verify toggle state
    const addButtons = page.getByRole("button", { name: "+ Add" });
    await addButtons.first().click();
    await expect(
      page.getByRole("button", { name: /Added/ })
    ).toBeVisible({ timeout: 3_000 });

    // Undo — click "Added" to remove it
    await page.getByRole("button", { name: /Added/ }).click();
    await expect(addButtons.first()).toBeVisible({ timeout: 3_000 });

    // Re-add before continuing
    await addButtons.first().click();

    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 9: Completion ──
    await expect(page.getByText("You're all set")).toBeVisible({
      timeout: 10_000,
    });

    // Swap user status mock to "completed" before navigating to briefing
    await page.unroute("**/api/user/status", statusHandler);
    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "completed" }),
      });
    });

    await page
      .getByRole("button", { name: "Go to Your Dashboard" })
      .click();

    // Wait for router.push to settle, then navigate explicitly
    await page.waitForTimeout(2000);
    await page.goto("/briefing");

    await expect(page.getByText("Your Briefing")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("NVIDIA announced new H200")
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("acquired CloudSecure")
    ).toBeVisible();
    await expect(
      page.getByText("enforcement roadmap")
    ).toBeVisible();
  });
});
