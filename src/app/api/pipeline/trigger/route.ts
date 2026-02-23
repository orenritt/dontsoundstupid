import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";
import { updatePipelineStatus } from "@/lib/pipeline-status";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  updatePipelineStatus(userId, "starting");

  // Fire and forget — pipeline runs in background, client polls /api/pipeline/status
  runPipeline(userId).catch((err) => {
    console.error("Pipeline failed:", err);
    updatePipelineStatus(userId, "failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  });

  return NextResponse.json({ started: true });
}
