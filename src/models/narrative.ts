export type NarrativeSourceType = "news-api" | "social-trends" | "search-trends";

export interface NarrativeSource {
  id: string;
  type: NarrativeSourceType;
  config: Record<string, string>;
  active: boolean;
  createdAt: string;
}

export interface NarrativeFrame {
  id: string;
  topicArea: string;
  title: string;
  description: string;
  firstSeenAt: string;
  lastSeenAt: string;
  momentumScore: number;
  adoptionCount: number;
  relatedSignalIds: string[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TermBurst {
  id: string;
  topicArea: string;
  term: string;
  frequencyDelta: number;
  firstAppearance: string;
  adoptionVelocity: number;
  contextExamples: string[];
  sourceCount: number;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeAnalysis {
  topicArea: string;
  frames: NarrativeFrame[];
  termBursts: TermBurst[];
  analysisTimestamp: string;
  llmModel: string;
  signalCount: number;
}

export interface NarrativeConfig {
  llmProvider: string;
  llmModel: string;
  analysisFrequencyMinutes: number;
  minimumAdoptionThreshold: number;
  minimumSignalCount: number;
}
