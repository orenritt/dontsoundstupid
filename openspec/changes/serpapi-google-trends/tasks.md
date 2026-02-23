# SerpAPI Google Trends Integration

Replaced the broken `google-trends-api` npm scraper with SerpAPI's `google_trends` engine. The wiring is done — `executeQueryGoogleTrends` in `scoring-agent.ts` now hits SerpAPI via `fetch()` and the output format is unchanged.

## Status: placeholder wired up, needs API key to go live

## Remaining
- [ ] Get a SerpAPI API key and add it to `.env` as `SERPAPI_API_KEY`
- [ ] Test with real queries to confirm response mapping is correct
- [ ] Evaluate cost — SerpAPI charges per search; the scoring agent could call this multiple times per briefing run
- [ ] Consider caching trend results (same keywords within a day don't need re-fetching)
