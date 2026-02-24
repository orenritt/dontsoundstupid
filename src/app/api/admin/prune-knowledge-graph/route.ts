import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { pruneKnowledgeGraph } from "@/lib/knowledge-prune";

const ADMIN_EMAIL = "orenrittenberg@gmail.com";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db.execute(
    sql`SELECT email FROM users WHERE id = ${session.user.id} LIMIT 1`
  );
  const userRows = rows as unknown as { email: string }[];
  if (!userRows[0] || userRows[0].email !== ADMIN_EMAIL) return null;
  return session.user.id;
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const userId = body.userId as string;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await pruneKnowledgeGraph(userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pruning failed" },
      { status: 500 }
    );
  }
}
