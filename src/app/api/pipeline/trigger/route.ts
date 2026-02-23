import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";
import { updatePipelineStatus } from "@/lib/pipeline-status";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  updatePipelineStatus(userId, "starting");

  let forceGenerate = false;
  try {
    const body = await request.json();
    forceGenerate = body.forceGenerate === true;
  } catch {
    // no body or invalid JSON — use defaults
  }

  runPipeline(userId, forceGenerate ? { forceGenerate: true } : undefined).catch((err) => {
    console.error("Pipeline failed:", err);
    updatePipelineStatus(userId, "failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  });

  return NextResponse.json({ started: true });
}
