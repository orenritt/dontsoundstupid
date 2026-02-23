import { db } from "./db";
import { signals } from "./schema";
import { and, gte, lt, sql } from "drizzle-orm";

interface SignalMomentumArgs {
  queries: string[];
  windowDays?: number;
}

interface MatchingSignal {
  title: string;
  ingestedAt: string;
  layer: string;
}

interface QueryMomentumResult {
  query: string;
  currentWindow: { count: number; start: string; end: string };
  priorWindow: { count: number; start: string; end: string };
  acceleration: "surging" | "rising" | "stable" | "declining" | "new";
  accelerationRatio: number;
  topSignals: MatchingSignal[];
}

function classifyAcceleration(
  currentCount: number,
  priorCount: number
): { acceleration: QueryMomentumResult["acceleration"]; ratio: number } {
  if (currentCount === 0 && priorCount === 0) {
    return { acceleration: "stable", ratio: 0 };
  }
  if (priorCount === 0 && currentCount > 0) {
    return { acceleration: "new", ratio: Infinity };
  }

  const ratio = currentCount / priorCount;

  if (ratio >= 3.0) return { acceleration: "surging", ratio };
  if (ratio >= 1.5) return { acceleration: "rising", ratio };
  if (ratio >= 0.67) return { acceleration: "stable", ratio };
  return { acceleration: "declining", ratio };
}

export async function executeCheckSignalMomentum(
  args: SignalMomentumArgs
): Promise<{ results: QueryMomentumResult[]; capped?: boolean }> {
  const rawQueries = args.queries ?? [];
  const capped = rawQueries.length > 5;
  const queries = rawQueries.slice(0, 5);
  const windowDays = Math.max(1, Math.min(30, args.windowDays ?? 7));

  const now = new Date();
  const currentStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now.getTime() - 2 * windowDays * 24 * 60 * 60 * 1000);

  const results: QueryMomentumResult[] = [];

  for (const query of queries) {
    const pattern = `%${query.toLowerCase()}%`;
    const matchCondition = sql`(
      lower(${signals.title}) like ${pattern}
      OR lower(${signals.summary}) like ${pattern}
      OR lower(${signals.content}) like ${pattern}
    )`;

    const [currentRows, priorRows, topSignalRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(signals)
        .where(
          and(
            gte(signals.ingestedAt, currentStart),
            matchCondition
          )
        ),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(signals)
        .where(
          and(
            gte(signals.ingestedAt, priorStart),
            lt(signals.ingestedAt, currentStart),
            matchCondition
          )
        ),

      db
        .select({
          title: signals.title,
          ingestedAt: signals.ingestedAt,
          layer: signals.layer,
        })
        .from(signals)
        .where(
          and(
            gte(signals.ingestedAt, priorStart),
            matchCondition
          )
        )
        .orderBy(sql`${signals.ingestedAt} desc`)
        .limit(3),
    ]);

    const currentCount = currentRows[0]?.count ?? 0;
    const priorCount = priorRows[0]?.count ?? 0;
    const { acceleration, ratio } = classifyAcceleration(currentCount, priorCount);

    results.push({
      query,
      currentWindow: {
        count: currentCount,
        start: currentStart.toISOString(),
        end: now.toISOString(),
      },
      priorWindow: {
        count: priorCount,
        start: priorStart.toISOString(),
        end: currentStart.toISOString(),
      },
      acceleration,
      accelerationRatio: ratio === Infinity ? 999 : Math.round(ratio * 100) / 100,
      topSignals: topSignalRows.map((r) => ({
        title: r.title,
        ingestedAt: r.ingestedAt.toISOString(),
        layer: r.layer,
      })),
    });
  }

  return capped ? { results, capped: true } : { results };
}
