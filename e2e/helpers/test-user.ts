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
 * Sign up and log in via the UI. Returns the credentials used.
 */
export async function signUpViaUI(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dontsoundstupid.com`;
  const password = "TestPassword123!";

  await page.goto("/auth/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Wait for redirect to onboarding
  await page.waitForURL("**/onboarding**", { timeout: 15_000 });

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
  // Get CSRF token first
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
