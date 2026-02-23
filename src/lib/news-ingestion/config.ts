export interface NewsIngestionConfig {
  pollIntervalMinutes: number;
  maxArticlesPerQuery: number;
  lookbackHours: number;
  rateLimitCooldownSeconds: number;
  interQueryDelayMs: number;
  maxQueriesPerCycle: number;
  gkgEnabled: boolean;
}

const DEFAULT_CONFIG: NewsIngestionConfig = {
  pollIntervalMinutes: 1440,
  maxArticlesPerQuery: 25,
  lookbackHours: 24,
  rateLimitCooldownSeconds: 60,
  interQueryDelayMs: 2000,
  maxQueriesPerCycle: 50,
  gkgEnabled: true,
};

export function loadNewsIngestionConfig(): NewsIngestionConfig {
  return {
    pollIntervalMinutes:
      parseInt(process.env.NEWS_POLL_INTERVAL_MINUTES ?? "", 10) || DEFAULT_CONFIG.pollIntervalMinutes,
    maxArticlesPerQuery:
      parseInt(process.env.NEWS_MAX_ARTICLES_PER_QUERY ?? "", 10) || DEFAULT_CONFIG.maxArticlesPerQuery,
    lookbackHours:
      parseInt(process.env.NEWS_LOOKBACK_HOURS ?? "", 10) || DEFAULT_CONFIG.lookbackHours,
    rateLimitCooldownSeconds:
      parseInt(process.env.NEWS_RATE_LIMIT_COOLDOWN_SECONDS ?? "", 10) || DEFAULT_CONFIG.rateLimitCooldownSeconds,
    interQueryDelayMs:
      parseInt(process.env.NEWS_INTER_QUERY_DELAY_MS ?? "", 10) || DEFAULT_CONFIG.interQueryDelayMs,
    maxQueriesPerCycle:
      parseInt(process.env.NEWS_MAX_QUERIES_PER_CYCLE ?? "", 10) || DEFAULT_CONFIG.maxQueriesPerCycle,
    gkgEnabled:
      process.env.NEWS_GKG_ENABLED !== undefined
        ? process.env.NEWS_GKG_ENABLED === "true"
        : DEFAULT_CONFIG.gkgEnabled,
  };
}
