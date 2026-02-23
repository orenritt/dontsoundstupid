CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE signal_layer AS ENUM (
  'syndication',
  'research',
  'narrative',
  'events',
  'personal-graph',
  'ai-research'
);

CREATE TABLE signals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layer         signal_layer NOT NULL,
  source_url    TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  summary       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  embedding     vector(1536),
  embedding_model TEXT,
  published_at  TIMESTAMPTZ NOT NULL,
  ingested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_source_url UNIQUE (source_url)
);

CREATE TABLE dedup_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id       UUID NOT NULL REFERENCES signals(id),
  duplicate_of_id UUID NOT NULL REFERENCES signals(id),
  similarity      FLOAT NOT NULL CHECK (similarity >= 0 AND similarity <= 1),
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_dedup_pair UNIQUE (signal_id, duplicate_of_id),
  CONSTRAINT no_self_dedup CHECK (signal_id != duplicate_of_id)
);

CREATE INDEX idx_signals_layer ON signals (layer);
CREATE INDEX idx_signals_published_at ON signals (published_at DESC);
CREATE INDEX idx_signals_ingested_at ON signals (ingested_at DESC);
CREATE INDEX idx_signals_layer_published ON signals (layer, published_at DESC);
CREATE INDEX idx_signals_metadata ON signals USING GIN (metadata);

CREATE INDEX idx_signals_embedding ON signals
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_dedup_signal ON dedup_links (signal_id);
CREATE INDEX idx_dedup_duplicate_of ON dedup_links (duplicate_of_id);

CREATE TYPE trigger_reason AS ENUM (
  'followed-org',
  'peer-org',
  'impress-list',
  'intelligence-goal',
  'industry-scan',
  'personal-graph'
);

CREATE TABLE signal_provenance (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id         UUID NOT NULL REFERENCES signals(id),
  user_id           UUID NOT NULL,
  trigger_reason    trigger_reason NOT NULL,
  profile_reference TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_provenance UNIQUE (signal_id, user_id, trigger_reason, profile_reference)
);

CREATE INDEX idx_provenance_signal ON signal_provenance (signal_id);
CREATE INDEX idx_provenance_user ON signal_provenance (user_id);
CREATE INDEX idx_provenance_user_reason ON signal_provenance (user_id, trigger_reason);
