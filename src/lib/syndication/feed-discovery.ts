import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "DontSoundStupid/1.0 (RSS Reader)" },
});

const COMMON_FEED_PATHS = [
  "/feed",
  "/rss",
  "/atom.xml",
  "/feed.xml",
  "/rss.xml",
  "/feeds/posts/default",
  "/blog/feed",
  "/blog/rss",
  "/news/feed",
  "/blog/rss.xml",
];

export interface DiscoveredFeed {
  feedUrl: string;
  siteUrl: string;
  siteName: string;
  feedType: "rss" | "atom";
}

export async function discoverFeeds(domain: string): Promise<DiscoveredFeed[]> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const discovered: DiscoveredFeed[] = [];

  // Try HTML link tag discovery first
  try {
    const res = await fetch(normalizedBase, {
      headers: { "User-Agent": "DontSoundStupid/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      const feedUrls = extractFeedLinksFromHtml(html, normalizedBase);
      for (const url of feedUrls) {
        const feed = await tryParseFeed(url, normalizedBase);
        if (feed) discovered.push(feed);
      }
    }
  } catch {
    // HTML fetch failed, continue with path probing
  }

  if (discovered.length > 0) return discovered;

  // Probe common paths
  for (const path of COMMON_FEED_PATHS) {
    const url = `${normalizedBase}${path}`;
    const feed = await tryParseFeed(url, normalizedBase);
    if (feed) {
      discovered.push(feed);
      break;
    }
  }

  return discovered;
}

async function tryParseFeed(
  feedUrl: string,
  siteUrl: string
): Promise<DiscoveredFeed | null> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const isAtom = feedUrl.includes("atom") || (feed as Record<string, unknown>).feedUrl?.toString().includes("atom");
    return {
      feedUrl,
      siteUrl,
      siteName: feed.title || new URL(siteUrl).hostname,
      feedType: isAtom ? "atom" : "rss",
    };
  } catch {
    return null;
  }
}

function extractFeedLinksFromHtml(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<link[^>]+type=["'](application\/rss\+xml|application\/atom\+xml)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/);
    if (hrefMatch?.[1]) {
      let href = hrefMatch[1];
      if (href.startsWith("/")) {
        href = baseUrl + href;
      } else if (!href.startsWith("http")) {
        href = baseUrl + "/" + href;
      }
      links.push(href);
    }
  }

  return links;
}
