import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const ADMIN_EMAIL = "orenrittenberg@gmail.com";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ admin: false, reason: "unauthenticated" });
  }

  const rows = await db.execute(
    sql`SELECT email FROM users WHERE id = ${session.user.id} LIMIT 1`
  );
  const userRows = rows as unknown as { email: string }[];
  const email = userRows[0]?.email;

  if (email === ADMIN_EMAIL) {
    return NextResponse.json({ admin: true, email });
  }

  return NextResponse.json({ admin: false, reason: "not_admin" });
}
