/**
 * Backfill content universes for users who have profiles with parsedTopics
 * but no contentUniverse yet.
 *
 * Usage: npx tsx src/scripts/backfill-content-universe.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { users, userProfiles } from "../lib/schema";
import { eq, isNull } from "drizzle-orm";
import { generateContentUniverse } from "../lib/content-universe";

async function main() {
  const profiles = await db
    .select({
      userId: userProfiles.userId,
      parsedTopics: userProfiles.parsedTopics,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(isNull(userProfiles.contentUniverse));

  const eligible = profiles.filter((p) => {
    const topics = p.parsedTopics as string[] | null;
    return topics && topics.length > 0;
  });

  console.log(
    `Found ${eligible.length} user(s) with parsedTopics but no contentUniverse (of ${profiles.length} total without contentUniverse)`
  );

  let success = 0;
  let failed = 0;

  for (let i = 0; i < eligible.length; i++) {
    const { userId } = eligible[i];
    console.log(
      `[${i + 1}/${eligible.length}] Generating content universe for ${userId}...`
    );

    try {
      const result = await generateContentUniverse(userId);
      if (result) {
        console.log(
          `  ✓ v${result.version} — ${result.coreTopics.length} core topics, ${result.exclusions.length} exclusions`
        );
        success++;
      } else {
        console.log(`  ⚠ Returned null (missing profile data?)`);
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
      failed++;
    }
  }

  console.log(
    `\nDone. ${success} succeeded, ${failed} failed out of ${eligible.length} total.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
