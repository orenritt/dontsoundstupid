import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPipelineStatus } from "@/lib/pipeline-status";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getPipelineStatus(session.user.id);

  if (!status) {
    return NextResponse.json({ running: false });
  }

  return NextResponse.json({
    running: status.stage !== "done" && status.stage !== "failed",
    stage: status.stage,
    message: status.message,
    elapsedMs: Date.now() - status.startedAt,
    briefingId: status.briefingId ?? null,
    error: status.error ?? null,
  });
}
