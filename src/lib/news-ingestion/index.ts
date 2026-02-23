export { loadNewsIngestionConfig, type NewsIngestionConfig } from "./config";
export { GdeltDocClient, formatNearQuery, type GdeltArticle, type GdeltDocSearchResult } from "./gdelt-doc-client";
export { GdeltGkgClient, type GkgEntityMention } from "./gdelt-gkg-client";
export { deriveNewsQueries, contentHash } from "./query-derivation";
export { pollNewsQueries } from "./ingest";
