import { test, expect } from "@playwright/test";
import { mockFullBriefing, mockUserStatus } from "./helpers/api-mocks";

test.describe("Briefing feedback loop", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all APIs for the briefing page
    await mockFullBriefing(page);
    await mockUserStatus(page, "completed");

    // Mock the briefings/latest to return a briefing with the right shape
    await page.route("**/api/briefings/latest", async (route) => {
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
                content:
                  "NVIDIA announced new H200 allocation priorities for enterprise customers.",
                sourceUrl: "https://example.com/nvidia",
                sourceLabel: "Reuters",
                attribution: "Relevant to your infrastructure scaling.",
              },
              {
                id: "item-2",
                reason: "Peer company activity",
                reasonLabel: "Competitive",
                topic: "DataDog Acquires Security Startup",
                content:
                  "DataDog acquired CloudSecure for $340M, signaling a deeper push into security.",
                sourceUrl: "https://example.com/datadog",
                sourceLabel: "TechCrunch",
                attribution: "DataDog is on your peer list.",
              },
              {
                id: "item-3",
                reason: "Knowledge gap",
                reasonLabel: "Regulatory",
                topic: "EU AI Act Enforcement Timeline",
                content:
                  "The EU published its enforcement roadmap for the AI Act.",
                sourceUrl: "https://example.com/eu-ai",
                sourceLabel: "Financial Times",
                attribution: "You flagged AI regulation as a gap.",
              },
            ],
          },
        }),
      });
    });

    await page.goto("/briefing");
    await expect(page.getByText("Your Briefing")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deep-dive: clicking 'Tell me more' expands item with detail", async ({
    page,
  }) => {
    // Track the deep-dive API call
    const deepDiveRequest = page.waitForRequest("**/api/feedback/deep-dive");

    const tellMeMoreButtons = page.getByRole("button", {
      name: "Tell me more",
    });
    await tellMeMoreButtons.first().click();

    const req = await deepDiveRequest;
    const body = JSON.parse(req.postData()!);
    expect(body.briefingId).toBe("mock-briefing-001");
    expect(body.itemId).toBe("item-1");
    expect(body.topic).toBe("GPU Supply Chain Shifts");

    // The expanded text should appear
    await expect(
      page.getByText("NVIDIA's H200 allocation changes reflect")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("tune up: clicking thumbs-up sends 'more like this' feedback", async ({
    page,
  }) => {
    const tuneRequest = page.waitForRequest("**/api/feedback/tune");

    // Click the thumbs-up button on the first item
    const thumbsUp = page.getByTitle("More like this");
    await thumbsUp.first().click();

    const req = await tuneRequest;
    const body = JSON.parse(req.postData()!);
    expect(body.direction).toBe("up");
    expect(body.briefingId).toBe("mock-briefing-001");
    expect(body.itemId).toBe("item-1");

    // Toast message should appear
    await expect(
      page.getByText("More like this noted.")
    ).toBeVisible({ timeout: 3_000 });
  });

  test("tune down: clicking thumbs-down sends 'less like this' feedback", async ({
    page,
  }) => {
    const tuneRequest = page.waitForRequest("**/api/feedback/tune");

    const thumbsDown = page.getByTitle("Less like this");
    await thumbsDown.first().click();

    const req = await tuneRequest;
    const body = JSON.parse(req.postData()!);
    expect(body.direction).toBe("down");

    await expect(
      page.getByText("Less like this noted.")
    ).toBeVisible({ timeout: 3_000 });
  });

  test("not-novel: clicking 'I knew this' dismisses the item", async ({
    page,
  }) => {
    const notNovelRequest = page.waitForRequest("**/api/feedback/not-novel");

    // Verify item is visible first
    await expect(
      page.getByText("NVIDIA announced new H200")
    ).toBeVisible();

    const iKnewThis = page.getByRole("button", { name: "I knew this" });
    await iKnewThis.first().click();

    const req = await notNovelRequest;
    const body = JSON.parse(req.postData()!);
    expect(body.briefingId).toBe("mock-briefing-001");
    expect(body.itemId).toBe("item-1");

    // Item should be dismissed (removed from view)
    await expect(
      page.getByText("NVIDIA announced new H200")
    ).not.toBeVisible({ timeout: 3_000 });

    // Other items should still be visible
    await expect(
      page.getByText("DataDog acquired CloudSecure")
    ).toBeVisible();
  });
});
