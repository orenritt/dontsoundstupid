import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";
import { appendFileSync } from "fs";
import { join } from "path";

const DLOG = (msg: string, data: Record<string, unknown>) => { try { appendFileSync(join(process.cwd(), 'debug-b7450b.log'), JSON.stringify({ t: Date.now(), msg, ...data }) + '\n'); } catch {} };

export async function POST() {
  // #region agent log
  DLOG('POST-entry', {});
  // #endregion

  const session = await auth();

  // #region agent log
  DLOG('after-auth', { hasSession: !!session, hasUser: !!session?.user, userId: session?.user?.id ?? null });
  // #endregion

  if (!session?.user?.id) {
    // #region agent log
    DLOG('auth-rejected', { session: JSON.stringify(session) });
    // #endregion
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const briefingId = await runPipeline(session.user.id);

    // #region agent log
    DLOG('pipeline-result', { briefingId: briefingId ?? null });
    // #endregion

    if (!briefingId) {
      return NextResponse.json(
        { error: "No briefing generated" },
        { status: 500 }
      );
    }
    return NextResponse.json({ briefingId });
  } catch (e) {
    // #region agent log
    DLOG('pipeline-error', { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.slice(0, 500) : undefined });
    // #endregion

    console.error("Pipeline failed:", e);
    return NextResponse.json(
      { error: "Pipeline execution failed" },
      { status: 500 }
    );
  }
}
