import { type Page, type APIRequestContext } from "@playwright/test";

export const TEST_USER = {
  email: `e2e-${Date.now()}@test.dontsoundstupid.com`,
  password: "TestPassword123!",
  linkedinUrl: "https://www.linkedin.com/in/test-user-e2e",
};

/**
 * Create a test user via the signup API and return the credentials.
 * Each call generates a unique email to avoid collisions.
 */
export async function createTestUser(request: APIRequestContext) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dontsoundstupid.com`;
  const password = "TestPassword123!";

  const res = await request.post("/api/auth/signup", {
    data: { email, password },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Signup failed (${res.status()}): ${body}`);
  }

  return { email, password };
}

/**
 * Create a user via API, establish a session via NextAuth API, and navigate
 * to /onboarding.
 *
 * Uses the NextAuth credentials callback directly (no UI) to get session
 * cookies, then navigates to the onboarding page.
 */
export async function signUpAndGoToOnboarding(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dontsoundstupid.com`;
  const password = "TestPassword123!";

  // 1. Create user via API
  const signupRes = await page.request.post("/api/auth/signup", {
    data: { email, password },
  });
  if (!signupRes.ok()) {
    throw new Error(`Signup API failed: ${signupRes.status()} ${await signupRes.text()}`);
  }

  // 2. Get CSRF token and sign in via NextAuth API (sets session cookies)
  const csrfRes = await page.request.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  await page.request.post("/api/auth/callback/credentials", {
    form: {
      email,
      password,
      csrfToken,
      callbackUrl: "/onboarding",
    },
    maxRedirects: 0,
  });

  // 3. Navigate to onboarding with session cookies
  await page.goto("/onboarding");
  await page.waitForURL("**/onboarding**", { timeout: 10_000 });

  return { email, password };
}

/**
 * Log in via the UI with existing credentials.
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
}

/**
 * Log in via the NextAuth credentials endpoint to get session cookies.
 * Faster than going through the UI for tests that don't test the login flow itself.
 */
export async function loginViaAPI(request: APIRequestContext, email: string, password: string) {
  const csrfRes = await request.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  const res = await request.post("/api/auth/callback/credentials", {
    form: {
      email,
      password,
      csrfToken,
      callbackUrl: "/",
    },
  });

  return res;
}
