import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const briefingId = await runPipeline(session.user.id);
    if (!briefingId) {
      return NextResponse.json(
        { error: "No briefing generated" },
        { status: 500 }
      );
    }
    return NextResponse.json({ briefingId });
  } catch (e) {
    console.error("Pipeline failed:", e);
    return NextResponse.json(
      { error: "Pipeline execution failed" },
      { status: 500 }
    );
  }
}
