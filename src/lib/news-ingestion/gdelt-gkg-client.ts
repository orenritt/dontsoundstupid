const GDELT_GKG_API_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

export interface GkgEntityMention {
  url: string;
  title: string;
  sourceDomain: string;
  sourceCountry: string;
  language: string;
  seendate: string;
  tone: number;
  entityName: string;
  entityType: "organization" | "person";
}

interface GdeltApiArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  tone?: string;
}

export class GdeltGkgClient {
  async lookupOrganization(name: string): Promise<GkgEntityMention[]> {
    return this.lookupEntity(name, "organization");
  }

  async lookupPerson(name: string): Promise<GkgEntityMention[]> {
    return this.lookupEntity(name, "person");
  }

  private async lookupEntity(
    name: string,
    entityType: "organization" | "person"
  ): Promise<GkgEntityMention[]> {
    const themePrefix = entityType === "organization" ? "ORG_" : "PERSON_";
    const params = new URLSearchParams({
      query: `"${name}"`,
      mode: "ArtList",
      maxrecords: "10",
      format: "json",
      timespan: "24h",
      sort: "DateDesc",
    });

    const url = `${GDELT_GKG_API_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`GDELT GKG lookup error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { articles?: GdeltApiArticle[] };
    const rawArticles = data.articles ?? [];

    return rawArticles.map((a) => ({
      url: a.url ?? "",
      title: a.title ?? "",
      sourceDomain: a.domain ?? "",
      sourceCountry: a.sourcecountry ?? "",
      language: a.language ?? "",
      seendate: a.seendate ?? "",
      tone: parseFloat(a.tone?.split(",")[0] ?? "0"),
      entityName: name,
      entityType,
    }));
  }
}
