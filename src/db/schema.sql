CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE signal_layer AS ENUM (
  'syndication',
  'research',
  'narrative',
  'events',
  'personal-graph',
  'ai-research',
  'email-forward',
  'news'
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
  'personal-graph',
  'user-curated'
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

-- Syndication feed management

CREATE TYPE feed_type AS ENUM ('rss', 'atom', 'scrape');
CREATE TYPE feed_status AS ENUM ('active', 'paused', 'error', 'discovery-pending');

CREATE TABLE feed_sources (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url                 TEXT NOT NULL UNIQUE,
  domain              TEXT NOT NULL,
  feed_type           feed_type NOT NULL,
  status              feed_status NOT NULL DEFAULT 'active',
  poll_interval_min   INTEGER NOT NULL DEFAULT 60,
  discovered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feed_subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id       UUID NOT NULL REFERENCES feed_sources(id),
  user_id       UUID NOT NULL,
  reason        TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_feed_user UNIQUE (feed_id, user_id)
);

CREATE TABLE feed_poll_state (
  feed_id             UUID PRIMARY KEY REFERENCES feed_sources(id),
  last_fetched_at     TIMESTAMPTZ,
  last_item_date      TIMESTAMPTZ,
  last_content_hash   TEXT,
  consecutive_errors  INTEGER NOT NULL DEFAULT 0,
  last_error_message  TEXT,
  next_poll_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_sources_domain ON feed_sources (domain);
CREATE INDEX idx_feed_sources_status ON feed_sources (status);
CREATE INDEX idx_feed_subscriptions_user ON feed_subscriptions (user_id);
CREATE INDEX idx_feed_subscriptions_feed ON feed_subscriptions (feed_id);
CREATE INDEX idx_feed_poll_next ON feed_poll_state (next_poll_at);

-- Personal graph

CREATE TYPE graph_node_type AS ENUM ('person', 'organization');
CREATE TYPE graph_node_source AS ENUM ('impress-list', 'linkedin-connection', 'auto-derived');
CREATE TYPE watch_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE graph_relationship_type AS ENUM ('works-at', 'connected-to', 'mentioned-by');
CREATE TYPE graph_watch_type AS ENUM ('announcements', 'fundraising', 'hiring', 'terms', 'content');

CREATE TABLE graph_nodes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL,
  node_type       graph_node_type NOT NULL,
  name            TEXT NOT NULL,
  enrichment_ref  TEXT,
  watch_priority  watch_priority NOT NULL DEFAULT 'medium',
  added_source    graph_node_source NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE graph_edges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_node_id    UUID NOT NULL REFERENCES graph_nodes(id),
  target_node_id    UUID NOT NULL REFERENCES graph_nodes(id),
  relationship_type graph_relationship_type NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_edge UNIQUE (source_node_id, target_node_id, relationship_type),
  CONSTRAINT no_self_edge CHECK (source_node_id != target_node_id)
);

CREATE TABLE graph_watches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id         UUID NOT NULL REFERENCES graph_nodes(id),
  watch_type      graph_watch_type NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_watch UNIQUE (node_id, watch_type)
);

CREATE INDEX idx_graph_nodes_user ON graph_nodes (user_id);
CREATE INDEX idx_graph_nodes_type ON graph_nodes (node_type);
CREATE INDEX idx_graph_nodes_user_priority ON graph_nodes (user_id, watch_priority);
CREATE INDEX idx_graph_edges_source ON graph_edges (source_node_id);
CREATE INDEX idx_graph_edges_target ON graph_edges (target_node_id);
CREATE INDEX idx_graph_watches_node ON graph_watches (node_id);
CREATE INDEX idx_graph_watches_last_checked ON graph_watches (last_checked_at);

-- Research ingestion

CREATE TYPE research_source_type AS ENUM ('semantic-scholar', 'arxiv', 'pubmed', 'preprint');
CREATE TYPE research_source_status AS ENUM ('active', 'disabled', 'error');

CREATE TABLE research_sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type     research_source_type NOT NULL,
  name            TEXT NOT NULL,
  api_endpoint    TEXT NOT NULL,
  api_key         TEXT,
  rate_limit_rpm  INTEGER NOT NULL DEFAULT 30,
  timeout_ms      INTEGER NOT NULL DEFAULT 10000,
  status          research_source_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_research_source_type UNIQUE (source_type)
);

CREATE TABLE research_queries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL,
  query_text        TEXT NOT NULL,
  derived_from      TEXT NOT NULL CHECK (derived_from IN ('intelligence-goal', 'industry-topic', 'context-keyword', 'followed-author')),
  profile_reference TEXT NOT NULL,
  source_type       research_source_type NOT NULL REFERENCES research_sources(source_type),
  content_hash      TEXT NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_research_query UNIQUE (user_id, content_hash, source_type)
);

CREATE TABLE research_poll_state (
  query_id            UUID NOT NULL REFERENCES research_queries(id),
  source_type         research_source_type NOT NULL,
  last_polled_at      TIMESTAMPTZ,
  last_query_hash     TEXT NOT NULL,
  result_count        INTEGER NOT NULL DEFAULT 0,
  consecutive_errors  INTEGER NOT NULL DEFAULT 0,
  last_error_message  TEXT,
  next_poll_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (query_id, source_type)
);

CREATE INDEX idx_research_sources_status ON research_sources (status);
CREATE INDEX idx_research_queries_user ON research_queries (user_id);
CREATE INDEX idx_research_queries_source ON research_queries (source_type);
CREATE INDEX idx_research_queries_active ON research_queries (user_id, active);
CREATE INDEX idx_research_poll_next ON research_poll_state (next_poll_at);

-- Narrative detection

CREATE TYPE narrative_source_type AS ENUM ('news-api', 'social-trends', 'search-trends');

CREATE TABLE narrative_frames (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_area        TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL,
  last_seen_at      TIMESTAMPTZ NOT NULL,
  momentum_score    FLOAT NOT NULL DEFAULT 0,
  adoption_count    INTEGER NOT NULL DEFAULT 0,
  related_signal_ids UUID[] NOT NULL DEFAULT '{}',
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE term_bursts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_area          TEXT NOT NULL,
  term                TEXT NOT NULL,
  frequency_delta     FLOAT NOT NULL DEFAULT 0,
  first_appearance    TIMESTAMPTZ NOT NULL,
  adoption_velocity   FLOAT NOT NULL DEFAULT 0,
  context_examples    TEXT[] NOT NULL DEFAULT '{}',
  source_count        INTEGER NOT NULL DEFAULT 0,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narrative_frames_topic ON narrative_frames (topic_area);
CREATE INDEX idx_narrative_frames_momentum ON narrative_frames (momentum_score DESC);
CREATE INDEX idx_narrative_frames_first_seen ON narrative_frames (first_seen_at DESC);
CREATE INDEX idx_narrative_frames_metadata ON narrative_frames USING GIN (metadata);

CREATE INDEX idx_term_bursts_topic ON term_bursts (topic_area);
CREATE INDEX idx_term_bursts_velocity ON term_bursts (adoption_velocity DESC);
CREATE INDEX idx_term_bursts_first_appearance ON term_bursts (first_appearance DESC);
CREATE INDEX idx_term_bursts_metadata ON term_bursts USING GIN (metadata);

-- Events ingestion

CREATE TYPE event_source_type AS ENUM ('eventbrite', 'luma', 'meetup', 'manual');
CREATE TYPE event_source_status AS ENUM ('active', 'paused', 'error');
CREATE TYPE event_type AS ENUM ('conference', 'webinar', 'meetup', 'cfp');
CREATE TYPE event_delta_type AS ENUM ('new-event', 'theme-added', 'speaker-change', 'agenda-update');

CREATE TABLE event_sources (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type         event_source_type NOT NULL,
  name                TEXT NOT NULL,
  api_config          JSONB NOT NULL DEFAULT '{}',
  status              event_source_status NOT NULL DEFAULT 'active',
  poll_interval_min   INTEGER NOT NULL DEFAULT 60,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE industry_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id         UUID NOT NULL REFERENCES event_sources(id),
  external_id       TEXT,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  event_type        event_type NOT NULL,
  start_date        TIMESTAMPTZ NOT NULL,
  end_date          TIMESTAMPTZ,
  venue             TEXT,
  city              TEXT,
  country           TEXT,
  virtual_url       TEXT,
  is_virtual        BOOLEAN NOT NULL DEFAULT FALSE,
  speakers          TEXT[] NOT NULL DEFAULT '{}',
  topics            TEXT[] NOT NULL DEFAULT '{}',
  registration_url  TEXT,
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_source_event UNIQUE (source_id, external_id)
);

CREATE TABLE event_deltas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES industry_events(id),
  delta_type      event_delta_type NOT NULL,
  previous_value  TEXT,
  new_value       TEXT NOT NULL,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_trackers (
  event_id            UUID PRIMARY KEY REFERENCES industry_events(id),
  last_polled_at      TIMESTAMPTZ,
  last_content_hash   TEXT,
  consecutive_errors  INTEGER NOT NULL DEFAULT 0,
  last_error_message  TEXT,
  next_poll_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_sources_type ON event_sources (source_type);
CREATE INDEX idx_event_sources_status ON event_sources (status);
CREATE INDEX idx_industry_events_source ON industry_events (source_id);
CREATE INDEX idx_industry_events_type ON industry_events (event_type);
CREATE INDEX idx_industry_events_start ON industry_events (start_date);
CREATE INDEX idx_industry_events_topics ON industry_events USING GIN (topics);
CREATE INDEX idx_event_deltas_event ON event_deltas (event_id);
CREATE INDEX idx_event_deltas_type ON event_deltas (delta_type);
CREATE INDEX idx_event_deltas_detected ON event_deltas (detected_at DESC);
CREATE INDEX idx_event_trackers_next_poll ON event_trackers (next_poll_at);

-- Relevance scoring

CREATE TYPE scoring_factor_name AS ENUM (
  'keyword-match',
  'semantic-similarity',
  'provenance',
  'goal-alignment',
  'feedback-boost',
  'freshness'
);

CREATE TABLE relevance_scores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id     UUID NOT NULL REFERENCES signals(id),
  user_id       UUID NOT NULL,
  total_score   FLOAT NOT NULL CHECK (total_score >= 0 AND total_score <= 1),
  factors       JSONB NOT NULL,
  scored_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_score_per_run UNIQUE (signal_id, user_id, scored_at)
);

CREATE INDEX idx_relevance_scores_user ON relevance_scores (user_id);
CREATE INDEX idx_relevance_scores_signal ON relevance_scores (signal_id);
CREATE INDEX idx_relevance_scores_user_score ON relevance_scores (user_id, total_score DESC);
CREATE INDEX idx_relevance_scores_scored_at ON relevance_scores (scored_at DESC);
CREATE INDEX idx_relevance_scores_factors ON relevance_scores USING GIN (factors);

-- Briefing composer

CREATE TYPE delivery_channel AS ENUM ('email', 'slack', 'sms', 'whatsapp');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed', 'bounced');
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic');

CREATE TABLE briefing_deliveries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id       UUID NOT NULL,
  channel           delivery_channel NOT NULL,
  status            delivery_status NOT NULL DEFAULT 'pending',
  attempt_number    INTEGER NOT NULL DEFAULT 1,
  attempted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message     TEXT,

  CONSTRAINT unique_delivery_attempt UNIQUE (briefing_id, channel, attempt_number)
);

CREATE TABLE briefing_schedules (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE,
  next_delivery_at  TIMESTAMPTZ NOT NULL,
  timezone          TEXT NOT NULL,
  preferred_time    TEXT NOT NULL,
  last_delivered_at TIMESTAMPTZ,
  active            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_briefing_deliveries_briefing ON briefing_deliveries (briefing_id);
CREATE INDEX idx_briefing_deliveries_status ON briefing_deliveries (status);
CREATE INDEX idx_briefing_deliveries_channel ON briefing_deliveries (channel);
CREATE INDEX idx_briefing_schedules_next ON briefing_schedules (next_delivery_at) WHERE active = TRUE;
CREATE INDEX idx_briefing_schedules_user ON briefing_schedules (user_id);

-- Knowledge graph and novelty

CREATE TYPE knowledge_entity_type AS ENUM (
  'company', 'person', 'concept', 'term', 'product', 'event', 'fact'
);

CREATE TYPE knowledge_source AS ENUM (
  'profile-derived', 'industry-scan', 'briefing-delivered', 'deep-dive', 'feedback-implicit'
);

CREATE TYPE knowledge_relationship AS ENUM (
  'works-at', 'competes-with', 'uses', 'researches', 'part-of', 'related-to'
);

CREATE TABLE knowledge_entities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL,
  entity_type       knowledge_entity_type NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  source            knowledge_source NOT NULL,
  confidence        FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  known_since       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reinforced   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  embedding         vector(1536),
  embedding_model   TEXT,
  related_entity_ids UUID[] NOT NULL DEFAULT '{}',

  CONSTRAINT unique_user_entity UNIQUE (user_id, name, entity_type)
);

CREATE TABLE knowledge_edges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_entity_id  UUID NOT NULL REFERENCES knowledge_entities(id),
  target_entity_id  UUID NOT NULL REFERENCES knowledge_entities(id),
  relationship      knowledge_relationship NOT NULL,

  CONSTRAINT unique_knowledge_edge UNIQUE (source_entity_id, target_entity_id, relationship),
  CONSTRAINT no_self_knowledge_edge CHECK (source_entity_id != target_entity_id)
);

CREATE TABLE exposure_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL,
  signal_id     UUID NOT NULL REFERENCES signals(id),
  briefing_id   UUID NOT NULL,
  entity_ids    UUID[] NOT NULL DEFAULT '{}',
  delivered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_engaged  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_knowledge_entities_user ON knowledge_entities (user_id);
CREATE INDEX idx_knowledge_entities_user_type ON knowledge_entities (user_id, entity_type);
CREATE INDEX idx_knowledge_entities_user_source ON knowledge_entities (user_id, source);
CREATE INDEX idx_knowledge_entities_embedding ON knowledge_entities
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_knowledge_edges_source ON knowledge_edges (source_entity_id);
CREATE INDEX idx_knowledge_edges_target ON knowledge_edges (target_entity_id);

CREATE INDEX idx_exposure_records_user ON exposure_records (user_id);
CREATE INDEX idx_exposure_records_signal ON exposure_records (signal_id);
CREATE INDEX idx_exposure_records_user_delivered ON exposure_records (user_id, delivered_at DESC);
CREATE INDEX idx_exposure_records_briefing ON exposure_records (briefing_id);

-- Pipeline orchestrator

CREATE TYPE pipeline_run_status AS ENUM ('scheduled', 'running', 'completed', 'partial-failure', 'failed');
CREATE TYPE pipeline_run_type AS ENUM ('daily', 't0-seeding', 'retry', 'manual');
CREATE TYPE pipeline_stage AS ENUM ('ingestion', 'scoring', 'novelty-filtering', 'composition', 'delivery', 'knowledge-update');
CREATE TYPE stage_outcome AS ENUM ('success', 'partial-failure', 'failure', 'skipped');

CREATE TABLE pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL,
  status          pipeline_run_status NOT NULL DEFAULT 'scheduled',
  run_type        pipeline_run_type NOT NULL DEFAULT 'daily',
  briefing_id     UUID,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE TABLE pipeline_stages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id            UUID NOT NULL REFERENCES pipeline_runs(id),
  stage             pipeline_stage NOT NULL,
  outcome           stage_outcome NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  signals_processed INTEGER NOT NULL DEFAULT 0,
  signals_passed    INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,

  CONSTRAINT unique_run_stage UNIQUE (run_id, stage)
);

CREATE TABLE ingestion_cycles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  layers_completed      TEXT[] NOT NULL DEFAULT '{}',
  layers_failed         TEXT[] NOT NULL DEFAULT '{}',
  total_signals_ingested INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_pipeline_runs_user ON pipeline_runs (user_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs (status);
CREATE INDEX idx_pipeline_runs_started ON pipeline_runs (started_at DESC);
CREATE INDEX idx_pipeline_runs_user_type ON pipeline_runs (user_id, run_type);
CREATE INDEX idx_pipeline_stages_run ON pipeline_stages (run_id);
CREATE INDEX idx_ingestion_cycles_started ON ingestion_cycles (started_at DESC);

-- News ingestion (GDELT)

CREATE TYPE news_query_derived_from AS ENUM ('impress-list', 'peer-org', 'intelligence-goal', 'industry');

CREATE TABLE news_queries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL,
  query_text        TEXT NOT NULL,
  derived_from      news_query_derived_from NOT NULL,
  profile_reference TEXT NOT NULL,
  content_hash      TEXT NOT NULL,
  geographic_filters TEXT[] NOT NULL DEFAULT '{}',
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_news_query UNIQUE (user_id, content_hash)
);

CREATE TABLE news_poll_state (
  query_id            UUID PRIMARY KEY REFERENCES news_queries(id),
  last_polled_at      TIMESTAMPTZ,
  result_count        INTEGER NOT NULL DEFAULT 0,
  consecutive_errors  INTEGER NOT NULL DEFAULT 0,
  last_error_message  TEXT,
  next_poll_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_news_queries_user ON news_queries (user_id);
CREATE INDEX idx_news_queries_active ON news_queries (user_id, active);
CREATE INDEX idx_news_queries_hash ON news_queries (content_hash);
CREATE INDEX idx_news_poll_next ON news_poll_state (next_poll_at);

-- Channel reply processing

CREATE TYPE reply_intent AS ENUM (
  'deep-dive', 'tune-more', 'tune-less', 'already-knew', 'follow-up', 'unrecognized'
);

CREATE TABLE reply_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL,
  briefing_id         UUID NOT NULL,
  channel             delivery_channel NOT NULL,
  briefing_items      JSONB NOT NULL,
  conversation_history JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_reply_sessions_user ON reply_sessions (user_id);
CREATE INDEX idx_reply_sessions_expires ON reply_sessions (expires_at);
CREATE INDEX idx_reply_sessions_user_briefing ON reply_sessions (user_id, briefing_id);

CREATE TABLE inbound_replies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL,
  session_id            UUID NOT NULL REFERENCES reply_sessions(id),
  channel               delivery_channel NOT NULL,
  raw_message           TEXT NOT NULL,
  classified_intent     reply_intent NOT NULL,
  resolved_item_number  INTEGER CHECK (resolved_item_number >= 1 AND resolved_item_number <= 5),
  confidence            FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inbound_replies_user ON inbound_replies (user_id);
CREATE INDEX idx_inbound_replies_session ON inbound_replies (session_id);
CREATE INDEX idx_inbound_replies_processed ON inbound_replies (processed_at DESC);

-- Email forward ingestion

CREATE TABLE email_forwards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL,
  sender_email    TEXT NOT NULL,
  subject         TEXT NOT NULL,
  user_annotation TEXT,
  forwarded_content TEXT NOT NULL,
  original_sender TEXT,
  extracted_urls  TEXT[] NOT NULL DEFAULT '{}',
  primary_url     TEXT,
  signal_id       UUID REFERENCES signals(id),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_forwards_user ON email_forwards (user_id);
CREATE INDEX idx_email_forwards_user_received ON email_forwards (user_id, received_at DESC);
CREATE INDEX idx_email_forwards_signal ON email_forwards (signal_id);
