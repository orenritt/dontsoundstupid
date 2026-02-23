export type GraphNodeType = "person" | "organization";

export type GraphNodeSource =
  | "impress-list"
  | "linkedin-connection"
  | "auto-derived";

export type WatchPriority = "high" | "medium" | "low";

export interface GraphNode {
  id: string;
  userId: string;
  nodeType: GraphNodeType;
  name: string;
  enrichmentRef: string | null;
  watchPriority: WatchPriority;
  addedSource: GraphNodeSource;
  createdAt: string;
  updatedAt: string;
}

export type GraphRelationshipType =
  | "works-at"
  | "connected-to"
  | "mentioned-by";

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: GraphRelationshipType;
  createdAt: string;
}

export type GraphWatchType =
  | "announcements"
  | "fundraising"
  | "hiring"
  | "terms"
  | "content";

export interface GraphWatch {
  id: string;
  nodeId: string;
  watchType: GraphWatchType;
  lastCheckedAt: string;
  createdAt: string;
}

export type GraphActivityType =
  | "new-term-usage"
  | "announcement"
  | "fundraising"
  | "hiring"
  | "topic-velocity";

export interface GraphSignal {
  activityType: GraphActivityType;
  nodeId: string;
  nodeName: string;
  details: Record<string, string>;
  detectedAt: string;
}

export interface PersonalGraphConfig {
  enrichmentRefreshIntervalMs: number;
  maxWatchNodes: number;
  activityDetectionThreshold: number;
}
