/** Stubbed LinkedIn enrichment — returns mock data for now. Replace with Proxycurl later. */
export interface EnrichedPerson {
  name: string;
  title: string;
  company: string;
  photoUrl: string;
  linkedinUrl: string;
}

export async function enrichLinkedinProfile(
  linkedinUrl: string
): Promise<EnrichedPerson> {
  const slug = linkedinUrl.split("/in/")[1]?.replace(/\//g, "") ?? "user";
  const mockName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    name: mockName || "Unknown User",
    title: "Product Manager",
    company: "Acme Corp",
    photoUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(mockName)}`,
    linkedinUrl,
  };
}

export interface MockPeerOrg {
  name: string;
  domain: string;
  description: string;
}

export function getMockPeerOrgs(): MockPeerOrg[] {
  return [
    {
      name: "Garmin Health",
      domain: "garmin.com",
      description: "Wearable technology and health monitoring devices",
    },
    {
      name: "Whoop",
      domain: "whoop.com",
      description: "Performance optimization wearables",
    },
    {
      name: "Oura Health",
      domain: "ouraring.com",
      description: "Smart ring health tracking",
    },
    {
      name: "Withings",
      domain: "withings.com",
      description: "Connected health devices and scales",
    },
  ];
}
