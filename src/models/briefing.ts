export interface BriefingItem {
  id: string;
  topic: string;
  category: string;
  source: string;
  summary: string;
  content: string;
  relevanceScore: number;
  metadata: Record<string, string>;
}

export interface Briefing {
  id: string;
  userId: string;
  items: BriefingItem[];
  generatedAt: string;
  deliveredAt: string | null;
}
