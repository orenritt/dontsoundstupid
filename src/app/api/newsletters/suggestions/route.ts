import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rankNewslettersForUser } from "@/lib/newsletter-ranking";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestions = await rankNewslettersForUser(session.user.id);

  return NextResponse.json({ suggestions });
}
