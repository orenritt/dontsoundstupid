export interface NewsIngestionConfig {
  pollIntervalMinutes: number;
  maxArticlesPerQuery: number;
  lookbackHours: number;
  maxQueriesPerCycle: number;
}

const DEFAULT_CONFIG: NewsIngestionConfig = {
  pollIntervalMinutes: 120,
  maxArticlesPerQuery: 25,
  lookbackHours: 24,
  maxQueriesPerCycle: 50,
};

export function loadNewsIngestionConfig(): NewsIngestionConfig {
  return {
    pollIntervalMinutes:
      parseInt(process.env.NEWS_POLL_INTERVAL_MINUTES ?? "", 10) || DEFAULT_CONFIG.pollIntervalMinutes,
    maxArticlesPerQuery:
      parseInt(process.env.NEWS_MAX_ARTICLES_PER_QUERY ?? "", 10) || DEFAULT_CONFIG.maxArticlesPerQuery,
    lookbackHours:
      parseInt(process.env.NEWS_LOOKBACK_HOURS ?? "", 10) || DEFAULT_CONFIG.lookbackHours,
    maxQueriesPerCycle:
      parseInt(process.env.NEWS_MAX_QUERIES_PER_CYCLE ?? "", 10) || DEFAULT_CONFIG.maxQueriesPerCycle,
  };
}
