import { db } from "./db";
import {
  signals,
  signalProvenance,
  narrativeFrames,
  termBursts,
  narrativeAnalysisRuns,
  users,
  userProfiles,
  peerOrganizations,
} from "./schema";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { chat } from "./llm";
import { toStringArray } from "./safe-parse";
import { createLogger } from "./logger";

const log = createLogger("narrative-detection");

const MIN_SIGNALS_FOR_ANALYSIS = 10;
const MIN_ADOPTION_THRESHOLD = 2;

interface DetectedFrame {
  title: string;
  description: string;
  momentumScore: number;
  adoptionCount: number;
  relatedSignalIndices: number[];
}

interface DetectedTermBurst {
  term: string;
  frequencyDelta: number;
  adoptionVelocity: number;
  contextExamples: string[];
  sourceCount: number;
}

interface AnalysisResult {
  frames: DetectedFrame[];
  termBursts: DetectedTermBurst[];
}

/**
 * Runs narrative analysis for a specific topic area, analyzing recent signals
 * to detect emerging frames and term bursts.
 */
export async function analyzeNarratives(topicArea: string): Promise<{
  framesDetected: number;
  termBurstsDetected: number;
  signalsAnalyzed: number;
}> {
  const tlog = log.child({ topicArea });

  // Get signals from the last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const recentSignals = await db
    .select({
      id: signals.id,
      title: signals.title,
      summary: signals.summary,
      sourceUrl: signals.sourceUrl,
      metadata: signals.metadata,
      layer: signals.layer,
      publishedAt: signals.publishedAt,
    })
    .from(signals)
    .where(gte(signals.ingestedAt, cutoff))
    .orderBy(desc(signals.ingestedAt))
    .limit(200);

  if (recentSignals.length < MIN_SIGNALS_FOR_ANALYSIS) {
    tlog.debug({ signalCount: recentSignals.length }, "Too few signals for narrative analysis");
    return { framesDetected: 0, termBurstsDetected: 0, signalsAnalyzed: 0 };
  }

  tlog.info({ signalCount: recentSignals.length }, "Running narrative analysis");

  const signalList = recentSignals
    .map((s, i) => `[${i}] ${s.title}\n${s.summary?.slice(0, 200) || ""}`)
    .join("\n\n");

  const result = await detectFramesAndBursts(topicArea, signalList);

  // Persist frames
  let framesDetected = 0;
  for (const frame of result.frames) {
    if (frame.adoptionCount < MIN_ADOPTION_THRESHOLD) continue;

    const relatedIds = frame.relatedSignalIndices
      .filter((i) => i >= 0 && i < recentSignals.length)
      .map((i) => recentSignals[i]!.id);

    // Upsert: if a frame with the same title in the same topic area exists, update it
    const existing = await db
      .select()
      .from(narrativeFrames)
      .where(
        and(
          eq(narrativeFrames.topicArea, topicArea),
          eq(narrativeFrames.title, frame.title)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0]!;
      const mergedSignalIds = [
        ...new Set([...(prev.relatedSignalIds || []), ...relatedIds]),
      ];
      await db
        .update(narrativeFrames)
        .set({
          description: frame.description,
          momentumScore: frame.momentumScore,
          adoptionCount: frame.adoptionCount,
          relatedSignalIds: mergedSignalIds,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(narrativeFrames.id, prev.id));
    } else {
      await db.insert(narrativeFrames).values({
        topicArea,
        title: frame.title,
        description: frame.description,
        momentumScore: frame.momentumScore,
        adoptionCount: frame.adoptionCount,
        relatedSignalIds: relatedIds,
      });
    }
    framesDetected++;
  }

  // Persist term bursts
  let termBurstsDetected = 0;
  for (const burst of result.termBursts) {
    if (burst.sourceCount < MIN_ADOPTION_THRESHOLD) continue;

    await db
      .insert(termBursts)
      .values({
        topicArea,
        term: burst.term,
        frequencyDelta: burst.frequencyDelta,
        adoptionVelocity: burst.adoptionVelocity,
        sourceCount: burst.sourceCount,
        contextExamples: burst.contextExamples.slice(0, 5),
      })
      .onConflictDoUpdate({
        target: [termBursts.topicArea, termBursts.term],
        set: {
          frequencyDelta: burst.frequencyDelta,
          adoptionVelocity: burst.adoptionVelocity,
          sourceCount: burst.sourceCount,
          contextExamples: burst.contextExamples.slice(0, 5),
          updatedAt: new Date(),
        },
      });
    termBurstsDetected++;
  }

  // Record the analysis run
  await db.insert(narrativeAnalysisRuns).values({
    topicArea,
    signalCount: recentSignals.length,
    framesDetected,
    termBurstsDetected,
    modelUsed: "gpt-4o-mini",
  });

  tlog.info({ framesDetected, termBurstsDetected }, "Narrative analysis complete");

  return {
    framesDetected,
    termBurstsDetected,
    signalsAnalyzed: recentSignals.length,
  };
}

async function detectFramesAndBursts(
  topicArea: string,
  signalList: string
): Promise<AnalysisResult> {
  const response = await chat(
    [
      {
        role: "system",
        content: `You are a narrative analyst. Analyze the following signals and detect:

1. **Narrative Frames**: Distinct themes, angles, or framings that multiple sources are using. A frame is an interpretive lens, not just a topic (e.g., "AI as job destroyer" vs "AI as job creator" are two different frames about the same topic).

2. **Term Bursts**: New terms, jargon, or phrases that are emerging or gaining adoption velocity. These are specific words or short phrases that seem to be newly coined or rapidly spreading.

Return valid JSON:
{
  "frames": [
    {
      "title": "short frame title",
      "description": "what this frame says and why it's emerging",
      "momentumScore": 0.0-1.0,
      "adoptionCount": <number of signals using this frame>,
      "relatedSignalIndices": [<indices of signals using this frame>]
    }
  ],
  "termBursts": [
    {
      "term": "the specific term or phrase",
      "frequencyDelta": 0.0-1.0,
      "adoptionVelocity": 0.0-1.0,
      "contextExamples": ["how the term is used in context"],
      "sourceCount": <number of distinct sources>
    }
  ]
}

Rules:
- Only include frames present in 2+ signals
- Only include term bursts that are genuinely new or rapidly growing
- Momentum score: 0 = static, 1 = rapidly accelerating
- Be selective — quality over quantity. 3-7 frames max, 2-5 term bursts max.`,
      },
      {
        role: "user",
        content: `Topic area: ${topicArea}\n\nSignals:\n${signalList}`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 4096 }
  );

  try {
    let raw = response.content.trim();
    const fence = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fence?.[1]) raw = fence[1].trim();
    return JSON.parse(raw);
  } catch {
    log.error("Failed to parse narrative analysis LLM output");
    return { frames: [], termBursts: [] };
  }
}

/**
 * Derives topic areas from all user profiles for narrative analysis.
 */
export async function deriveTopicAreas(): Promise<string[]> {
  const profiles = await db
    .select({
      parsedTopics: userProfiles.parsedTopics,
      parsedInitiatives: userProfiles.parsedInitiatives,
    })
    .from(userProfiles);

  const peers = await db
    .select({ name: peerOrganizations.name })
    .from(peerOrganizations)
    .where(sql`${peerOrganizations.confirmed} IS NOT FALSE`);

  const topicSet = new Set<string>();

  for (const profile of profiles) {
    for (const topic of toStringArray(profile.parsedTopics)) {
      topicSet.add(topic.toLowerCase().trim());
    }
    for (const initiative of toStringArray(profile.parsedInitiatives)) {
      topicSet.add(initiative.toLowerCase().trim());
    }
  }

  // Add peer org industries as topic areas (capped)
  for (const peer of peers.slice(0, 10)) {
    topicSet.add(peer.name.toLowerCase().trim());
  }

  return [...topicSet].slice(0, 15);
}

/**
 * Creates narrative signals from high-momentum frames for downstream scoring.
 */
export async function emitNarrativeSignals(): Promise<number> {
  const highMomentumFrames = await db
    .select()
    .from(narrativeFrames)
    .where(gte(narrativeFrames.momentumScore, 0.5))
    .orderBy(desc(narrativeFrames.momentumScore))
    .limit(20);

  const recentBursts = await db
    .select()
    .from(termBursts)
    .where(gte(termBursts.adoptionVelocity, 0.5))
    .orderBy(desc(termBursts.adoptionVelocity))
    .limit(10);

  let emitted = 0;

  for (const frame of highMomentumFrames) {
    const sourceUrl = `narrative://frame/${frame.id}`;
    try {
      const [inserted] = await db
        .insert(signals)
        .values({
          layer: "narrative",
          sourceUrl,
          title: `Emerging narrative: ${frame.title}`,
          content: frame.description,
          summary: `${frame.title} — momentum ${(frame.momentumScore * 100).toFixed(0)}%, ${frame.adoptionCount} sources`,
          metadata: {
            narrative_type: "frame",
            topic_area: frame.topicArea,
            momentum: String(frame.momentumScore),
          },
          publishedAt: frame.lastSeenAt || new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: signals.id });

      if (inserted) {
        // Create provenance for all users with matching topics
        const matchingProfiles = await db
          .select({ userId: userProfiles.userId })
          .from(userProfiles);

        for (const profile of matchingProfiles) {
          await db
            .insert(signalProvenance)
            .values({
              signalId: inserted.id,
              userId: profile.userId,
              triggerReason: "industry-scan",
              profileReference: `narrative:${frame.topicArea}`,
            })
            .onConflictDoNothing();
        }
        emitted++;
      }
    } catch (err) {
      log.error({ err, frameId: frame.id }, "Failed to emit narrative signal");
    }
  }

  for (const burst of recentBursts) {
    const sourceUrl = `narrative://term-burst/${burst.id}`;
    try {
      const [inserted] = await db
        .insert(signals)
        .values({
          layer: "narrative",
          sourceUrl,
          title: `Emerging term: "${burst.term}"`,
          content: `The term "${burst.term}" is gaining traction. ${burst.contextExamples.slice(0, 2).join(" ")}`,
          summary: `"${burst.term}" — velocity ${(burst.adoptionVelocity * 100).toFixed(0)}%, ${burst.sourceCount} sources`,
          metadata: {
            narrative_type: "term-burst",
            topic_area: burst.topicArea,
            velocity: String(burst.adoptionVelocity),
          },
          publishedAt: burst.updatedAt || new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: signals.id });

      if (inserted) {
        const matchingProfiles = await db
          .select({ userId: userProfiles.userId })
          .from(userProfiles);

        for (const profile of matchingProfiles) {
          await db
            .insert(signalProvenance)
            .values({
              signalId: inserted.id,
              userId: profile.userId,
              triggerReason: "industry-scan",
              profileReference: `narrative:${burst.topicArea}`,
            })
            .onConflictDoNothing();
        }
        emitted++;
      }
    } catch (err) {
      log.error({ err, burstId: burst.id }, "Failed to emit term burst signal");
    }
  }

  log.info({ emitted }, "Narrative signals emitted");
  return emitted;
}
