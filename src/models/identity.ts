export interface EnrichedPerson {
  linkedinUrl: string;
  name: string;
  headline: string;
  currentRole: string;
  currentCompany: string;
  location: string;
  skills: string[];
  pastRoles: PastRole[];
  education: Education[];
  enrichedAt: string;
}

export interface PastRole {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface Education {
  institution: string;
  degree: string | null;
  field: string | null;
  endDate: string | null;
}

export interface CompanyEnrichment {
  name: string;
  domain: string | null;
  industry: string;
  size: CompanySize;
  fundingStage: string | null;
  techStack: string[];
  recentJobPostings: JobPosting[];
  enrichedAt: string;
}

export type CompanySize =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1001-5000"
  | "5000+";

export interface JobPosting {
  title: string;
  department: string | null;
  location: string | null;
  postedDate: string | null;
}

export interface IdentityLayer {
  user: EnrichedPerson;
  company: CompanyEnrichment;
}
