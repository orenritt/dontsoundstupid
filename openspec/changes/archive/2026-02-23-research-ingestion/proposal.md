## Why

Research ingestion is Layer 2 of the signal pipeline — pulling daily deltas from academic and research sources. While syndication covers blogs and news via RSS, the research layer taps structured academic APIs (Semantic Scholar, arXiv, PubMed, preprint servers) to surface papers, studies, and technical publications relevant to the user's domain. This gives users early visibility into emerging research that will eventually hit mainstream coverage.

## What Changes

- Define research source model: tracked academic APIs with per-source configuration
- Define research query model: queries derived from user profile (topics, keywords, authors to follow)
- Define research result model: normalized paper metadata (title, authors, abstract, DOI, citations)
- Define research poll state: last-polled tracking per query to enable incremental daily deltas
- Research results are stored as signals with layer "research" and full provenance

## Capabilities

### New Capabilities
- `research-ingestion`: Academic/research API polling for daily delta ingestion from Semantic Scholar, arXiv, PubMed, and preprint servers

## Impact

- New research source, query, result, and poll state types
- New DB tables for research sources, queries, and poll state
- Queries derived from user profiles: intelligence goals, industry topics, followed authors
