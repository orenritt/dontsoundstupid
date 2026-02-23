export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/onboarding/:path*", "/briefing/:path*", "/settings/:path*", "/admin/:path*"],
};
