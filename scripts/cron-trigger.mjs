/**
 * Railway cron trigger — run as a Railway cron service.
 *
 * Railway cron services must execute and exit cleanly.
 * This script calls the cron API endpoints with auth,
 * running the right jobs based on the current UTC date:
 *
 *   - ingest + daily:     every run
 *   - discover-feeds:     Sundays (weekly)
 *   - knowledge-gaps:     1st and 15th of the month (biweekly)
 *
 * Railway cron service setup:
 *   1. Add a new service in your Railway project
 *   2. Set the start command to: node scripts/cron-trigger.mjs
 *   3. Set the cron schedule to: 0 5 * * *  (daily at 5 AM UTC)
 *   4. Set env vars: APP_URL, CRON_SECRET (shared with the web service)
 */

const APP_URL = process.env.APP_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);
const CRON_SECRET = process.env.CRON_SECRET;

if (!APP_URL) {
  console.error("Missing APP_URL or RAILWAY_PUBLIC_DOMAIN env var");
  process.exit(1);
}
if (!CRON_SECRET) {
  console.error("Missing CRON_SECRET env var");
  process.exit(1);
}

const baseUrl = APP_URL.replace(/\/$/, "");
const headers = { authorization: `Bearer ${CRON_SECRET}` };

async function callEndpoint(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function runJob(name, path) {
  const start = Date.now();
  try {
    console.log(`[${name}] Starting...`);
    const { status, body } = await callEndpoint(path);
    const ms = Date.now() - start;
    if (status === 200) {
      console.log(`[${name}] Success (${ms}ms)`, body?.summary ?? "");
      return { job: name, status: "success", ms };
    }
    console.error(`[${name}] HTTP ${status} (${ms}ms)`, body);
    return { job: name, status: "error", ms, error: `HTTP ${status}` };
  } catch (err) {
    const ms = Date.now() - start;
    console.error(`[${name}] Failed (${ms}ms):`, err.message);
    return { job: name, status: "error", ms, error: err.message };
  }
}

const now = new Date();
const dayOfWeek = now.getUTCDay();
const dayOfMonth = now.getUTCDate();

console.log(`\nCron trigger started at ${now.toISOString()}`);
console.log(`  UTC day-of-week: ${dayOfWeek} (0=Sun), day-of-month: ${dayOfMonth}\n`);

const results = [];

// Always: ingest then daily briefing
results.push(await runJob("ingest", "/api/cron/ingest"));
results.push(await runJob("daily", "/api/cron/daily"));

// Weekly: feed discovery on Sundays
if (dayOfWeek === 0) {
  results.push(await runJob("discover-feeds", "/api/cron/discover-feeds"));
} else {
  console.log("[discover-feeds] Skipped (not Sunday)");
}

// Biweekly: knowledge gap scan on 1st and 15th
if (dayOfMonth === 1 || dayOfMonth === 15) {
  results.push(await runJob("knowledge-gaps", "/api/cron/knowledge-gaps"));
} else {
  console.log("[knowledge-gaps] Skipped (not 1st or 15th)");
}

// Summary
console.log("\n--- Summary ---");
for (const r of results) {
  console.log(`  ${r.job}: ${r.status} (${r.ms}ms)`);
}

const errors = results.filter((r) => r.status === "error");
if (errors.length > 0) {
  console.error(`\n${errors.length} job(s) failed.`);
  process.exit(1);
}

console.log("\nDone.");
process.exit(0);
