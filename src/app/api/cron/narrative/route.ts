import { NextResponse } from "next/server";
import {
  analyzeNarratives,
  deriveTopicAreas,
  emitNarrativeSignals,
} from "@/lib/narrative-detection";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const topicAreas = await deriveTopicAreas();

  const analysisResults: {
    topicArea: string;
    framesDetected: number;
    termBurstsDetected: number;
    signalsAnalyzed: number;
    error?: string;
  }[] = [];

  for (const topicArea of topicAreas) {
    try {
      const result = await analyzeNarratives(topicArea);
      analysisResults.push({ topicArea, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      analysisResults.push({
        topicArea,
        framesDetected: 0,
        termBurstsDetected: 0,
        signalsAnalyzed: 0,
        error: message,
      });
    }
  }

  // Emit high-momentum narratives as signals
  let signalsEmitted = 0;
  try {
    signalsEmitted = await emitNarrativeSignals();
  } catch (err) {
    console.error("Failed to emit narrative signals:", err);
  }

  const totalFrames = analysisResults.reduce((s, r) => s + r.framesDetected, 0);
  const totalBursts = analysisResults.reduce((s, r) => s + r.termBurstsDetected, 0);

  return NextResponse.json({
    topicAreasAnalyzed: topicAreas.length,
    totalFrames,
    totalBursts,
    signalsEmitted,
    results: analysisResults,
  });
}
