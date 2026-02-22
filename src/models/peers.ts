export interface PeerSuggestion {
  name: string;
  domain: string | null;
  industry: string;
  reasoning: string;
}

export interface PeerOrganization {
  suggestion: PeerSuggestion;
  confirmed: boolean;
  comment: string | null;
  reviewedAt: string;
}

export interface PeerList {
  organizations: PeerOrganization[];
  userAdded: PeerOrganization[];
  lastResearchedAt: string;
}
