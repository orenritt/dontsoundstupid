import { chat } from "./llm";

const PDL_BASE = "https://api.peopledatalabs.com/v5";

function getPdlKey(): string {
  const key = process.env.PDL_API_KEY;
  if (!key) throw new Error("PDL_API_KEY is not set");
  return key;
}

export interface EnrichedPerson {
  name: string;
  title: string;
  company: string;
  photoUrl: string;
  linkedinUrl: string;
  industry?: string;
  location?: string;
  companyLinkedinUrl?: string;
  companyDomain?: string;
  companySize?: string;
  companyIndustry?: string;
}

export interface EnrichedCompany {
  name: string;
  domain: string;
  industry: string;
  size: string;
  description: string;
  location: string;
  linkedinUrl: string;
  founded?: number;
  employeeCount?: number;
  tags?: string[];
}

export type PeerEntityType =
  | "company"
  | "publication"
  | "analyst"
  | "conference"
  | "regulatory-body"
  | "research-group"
  | "influencer"
  | "community";

export interface PeerOrg {
  name: string;
  domain: string;
  description: string;
  entityType?: PeerEntityType;
}

function normalizeLinkedinUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function avatarFallback(name: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function enrichLinkedinProfile(
  linkedinUrl: string
): Promise<EnrichedPerson> {
  const profile = normalizeLinkedinUrl(linkedinUrl);

  const res = await fetch(
    `${PDL_BASE}/person/enrich?${new URLSearchParams({
      profile,
      titlecase: "true",
      min_likelihood: "4",
      data_include: [
        "full_name",
        "first_name",
        "last_name",
        "job_title",
        "job_company_name",
        "job_company_website",
        "job_company_linkedin_url",
        "job_company_size",
        "job_company_industry",
        "industry",
        "location_name",
        "linkedin_url",
      ].join(","),
    })}`,
    {
      headers: { "X-Api-Key": getPdlKey() },
    }
  );

  if (res.status === 404) {
    return personFallback(linkedinUrl);
  }

  if (!res.ok) {
    console.error(`PDL person enrichment failed (${res.status}):`, await res.text());
    return personFallback(linkedinUrl);
  }

  const json = await res.json();
  const d = json.data ?? json;

  const fullName = d.full_name || buildName(d.first_name, d.last_name);

  return {
    name: fullName || slugToName(linkedinUrl),
    title: d.job_title || "",
    company: d.job_company_name || "",
    photoUrl: avatarFallback(fullName || slugToName(linkedinUrl)),
    linkedinUrl,
    industry: d.industry || d.job_company_industry || undefined,
    location: d.location_name || undefined,
    companyLinkedinUrl: d.job_company_linkedin_url || undefined,
    companyDomain: d.job_company_website || undefined,
    companySize: d.job_company_size || undefined,
    companyIndustry: d.job_company_industry || undefined,
  };
}

export async function enrichCompany(
  identifier: { linkedinUrl?: string; domain?: string; name?: string }
): Promise<EnrichedCompany | null> {
  const params: Record<string, string> = {
    titlecase: "true",
    min_likelihood: "4",
  };

  if (identifier.linkedinUrl) {
    params.profile = normalizeLinkedinUrl(identifier.linkedinUrl);
  } else if (identifier.domain) {
    params.website = identifier.domain;
  } else if (identifier.name) {
    params.name = identifier.name;
  } else {
    return null;
  }

  const res = await fetch(
    `${PDL_BASE}/company/enrich?${new URLSearchParams(params)}`,
    {
      headers: { "X-Api-Key": getPdlKey() },
    }
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    console.error(`PDL company enrichment failed (${res.status}):`, await res.text());
    return null;
  }

  const d = await res.json();

  return {
    name: d.name || "",
    domain: d.website || "",
    industry: d.industry || "",
    size: d.size || "",
    description: d.summary || d.description || "",
    location: d.location?.name || "",
    linkedinUrl: d.linkedin_url ? `https://${d.linkedin_url}` : "",
    founded: d.founded ?? undefined,
    employeeCount: d.employee_count ?? undefined,
    tags: d.tags ?? undefined,
  };
}

export async function derivePeerOrganizations(
  userCompany: string,
  userIndustry: string | undefined,
  userTitle: string | undefined,
  companySize: string | undefined
): Promise<PeerOrg[]> {
  const role = userTitle || "professional";
  const industry = userIndustry || "technology";
  const size = companySize || "unknown";

  const prompt = `A ${role} at "${userCompany}" in the ${industry} industry (company size: ${size}) needs to build an intelligence radar. Suggest 12-15 entities across ALL of these categories:

1. **Companies** (4-5): Direct competitors and adjacent-market players worth monitoring.
2. **Publications** (2-3): Trade publications, industry newsletters, or blogs that cover this space. Include the website domain.
3. **Analysts/Influencers** (2-3): Individual thought leaders, analysts, or commentators this person should follow. Use their personal site or primary platform domain.
4. **Conferences** (1-2): Key industry events or conferences relevant to this role.
5. **Regulatory/Research** (1-2): Regulatory bodies, standards organizations, or research groups whose output matters.
6. **Communities** (1): Industry forums, Slack groups, subreddits, or professional communities.

Return ONLY a JSON array, no markdown, no explanation. Each element:
{"name": "Entity Name", "domain": "example.com", "description": "One line on why they matter", "entityType": "company|publication|analyst|conference|regulatory-body|research-group|influencer|community"}`;

  const response = await chat(
    [
      {
        role: "system",
        content: "You are a competitive intelligence analyst. Return only valid JSON arrays. Every entry must have a name, domain, description, and entityType.",
      },
      { role: "user", content: prompt },
    ],
    { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 2048 }
  );

  try {
    const cleaned = response.content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as PeerOrg[];
    const validTypes = new Set<string>([
      "company", "publication", "analyst", "conference",
      "regulatory-body", "research-group", "influencer", "community",
    ]);
    return parsed
      .filter((p) => p.name)
      .map((p) => ({
        ...p,
        domain: p.domain || "",
        entityType: validTypes.has(p.entityType || "") ? p.entityType : "company",
      }));
  } catch {
    console.error("Failed to parse peer entity LLM response:", response.content);
    return [];
  }
}

function buildName(first?: string, last?: string): string {
  return [first, last].filter(Boolean).join(" ");
}

function slugToName(url: string): string {
  const slug = url.split("/in/")[1]?.replace(/\//g, "") ?? "User";
  return titleCase(slug.replace(/[-_]/g, " "));
}

function personFallback(linkedinUrl: string): EnrichedPerson {
  const name = slugToName(linkedinUrl);
  return {
    name,
    title: "",
    company: "",
    photoUrl: avatarFallback(name),
    linkedinUrl,
  };
}
