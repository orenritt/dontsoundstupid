import { test, expect } from "@playwright/test";
import { signUpViaUI } from "./helpers/test-user";
import {
  mockFullOnboarding,
  mockFullBriefing,
  mockUserStatus,
  mockPipelineStatus,
} from "./helpers/api-mocks";

test.describe("Full onboarding flow", () => {
  test("sign up → all 9 onboarding steps → briefing displayed", async ({
    page,
  }) => {
    // Mock all external API calls so tests run without real LLM/enrichment
    await mockFullOnboarding(page);
    await mockFullBriefing(page);
    await mockUserStatus(page, "completed");

    // Also mock the onboarding progress endpoint so it doesn't redirect
    await page.route("**/api/onboarding/progress", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ resumeStep: "linkedin" }),
      });
    });

    // Mock the user status for login redirect
    await page.route("**/api/user/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ onboardingStatus: "in_progress" }),
      });
    });

    // ── Step 0: Sign up ──
    await signUpViaUI(page);

    // ── Step 1: LinkedIn ──
    await expect(page.getByText("Who are you?")).toBeVisible();
    await page
      .getByPlaceholder("Paste your LinkedIn profile URL")
      .fill("https://www.linkedin.com/in/test-user-e2e");
    await page.getByRole("button", { name: "Next" }).click();

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
    await page.getByRole("button", { name: "Next" }).click();

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
    await expect(page.getByText("DataDog")).toBeVisible({ timeout: 10_000 });

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
    await expect(page.getByText("Coming Soon")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Skip for now").click();

    // ── Step 8: Newsletters ──
    await expect(page.getByText("Build your content universe")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 9: Completion ──
    await expect(page.getByText("You're all set")).toBeVisible({
      timeout: 10_000,
    });
    await page
      .getByRole("button", { name: "Go to Your Dashboard" })
      .click();

    // Wait for redirect to briefing page
    await page.waitForURL("**/briefing**", { timeout: 15_000 });

    // ── Verify briefing is displayed ──
    await expect(page.getByText("Your Briefing")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("GPU Supply Chain Shifts")
    ).toBeVisible();
    await expect(
      page.getByText("DataDog Acquires Security Startup")
    ).toBeVisible();
    await expect(
      page.getByText("EU AI Act Enforcement Timeline")
    ).toBeVisible();
  });
});
