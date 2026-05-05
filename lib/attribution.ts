import "server-only";
import type {
  AttributedSource,
  HeatmapCell,
  LLMProvider,
  LLMResponse,
  ScorecardRow,
  SearchResult,
  SourceType,
} from "./types";

const HIGH_AUTH = new Set([
  "wikipedia.org",
  "nih.gov",
  "mayoclinic.org",
  "webmd.com",
  "healthline.com",
  "consumerreports.org",
  "wirecutter.com",
  "nytimes.com",
  "forbes.com",
  "cnet.com",
  "rtings.com",
]);

const RETAILERS = new Set([
  "amazon.com",
  "walmart.com",
  "target.com",
  "bestbuy.com",
  "costco.com",
  "iherb.com",
]);

const FORUMS = new Set(["reddit.com", "quora.com", "stackexchange.com"]);

function classify(domain: string, title: string): SourceType {
  if (FORUMS.has(domain)) return "forum";
  if (RETAILERS.has(domain)) return "retailer";
  if (domain.endsWith(".gov") || domain.endsWith(".edu") || domain.includes("nih"))
    return "study";
  const t = title.toLowerCase();
  if (/best|top \d+|review of|comparison/.test(t)) return "listicle";
  if (/review/.test(t)) return "review";
  if (/news|reports?/.test(t)) return "news";
  if (HIGH_AUTH.has(domain)) return "review";
  return "other";
}

function authority(domain: string, type: SourceType): number {
  if (HIGH_AUTH.has(domain)) return 90;
  if (type === "study") return 95;
  if (type === "retailer") return 70;
  if (type === "listicle" || type === "review") return 60;
  if (type === "forum") return 45;
  if (type === "news") return 65;
  return 50;
}

function normalizeBrand(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pageMentions(brand: string, page: SearchResult): boolean {
  const needle = normalizeBrand(brand);
  if (!needle) return false;
  const haystack = normalizeBrand(
    `${page.title} ${page.snippet} ${page.content ?? ""}`,
  );
  return haystack.includes(needle);
}

export interface AttributionResult {
  scorecard: ScorecardRow[];
  heatmap: HeatmapCell[];
  sources: AttributedSource[];
  coverageGaps: Array<{ url: string; domain: string; competitors: string[] }>;
}

export function attributeSources(
  llmResponses: LLMResponse[],
  searchResults: SearchResult[],
  userBrand: string | null,
): AttributionResult {
  const userKey = userBrand ? normalizeBrand(userBrand) : null;

  const matchesUser = (s: string) =>
    !!userKey && normalizeBrand(s).includes(userKey);

  const scorecard: ScorecardRow[] = llmResponses.map((r) => {
    const userHit = userKey
      ? r.rankings.find((b) => matchesUser(b.brand))
      : undefined;
    return {
      llm: r.llm,
      mentionedUserBrand: !!userHit,
      userBrandRank: userHit?.rank ?? null,
      userBrandSentiment: userHit?.sentiment ?? null,
      competitors: r.rankings
        .filter((b) => !userKey || !matchesUser(b.brand))
        .map((b) => b.brand),
    };
  });

  const allBrands = Array.from(
    new Map(
      llmResponses.flatMap((r) =>
        r.rankings.map((b) => [normalizeBrand(b.brand), b.brand] as const),
      ),
    ).values(),
  );

  const heatmap: HeatmapCell[] = [];
  for (const brand of allBrands) {
    for (const r of llmResponses) {
      const hit = r.rankings.find(
        (b) => normalizeBrand(b.brand) === normalizeBrand(brand),
      );
      heatmap.push({
        brand,
        llm: r.llm,
        rank: hit?.rank ?? null,
        sentiment: hit?.sentiment ?? null,
      });
    }
  }

  const sources: AttributedSource[] = [];
  for (const page of searchResults) {
    const brandsMentioned = allBrands.filter((b) => pageMentions(b, page));
    const llmsInfluenced: LLMProvider[] = [];
    for (const r of llmResponses) {
      const overlap = r.rankings.some((b) =>
        brandsMentioned.some(
          (bm) => normalizeBrand(bm) === normalizeBrand(b.brand),
        ),
      );
      if (overlap) llmsInfluenced.push(r.llm);
    }
    if (brandsMentioned.length === 0) continue;
    const type = classify(page.domain, page.title);
    sources.push({
      url: page.url,
      domain: page.domain,
      title: page.title,
      type,
      authorityHint: authority(page.domain, type),
      brandsMentioned,
      llmsInfluenced,
      userBrandPresent: userKey
        ? brandsMentioned.some((b) => matchesUser(b))
        : false,
    });
  }

  sources.sort(
    (a, b) =>
      b.llmsInfluenced.length - a.llmsInfluenced.length ||
      b.authorityHint - a.authorityHint,
  );

  const coverageGaps = userKey
    ? sources
        .filter((s) => !s.userBrandPresent && s.brandsMentioned.length > 0)
        .slice(0, 10)
        .map((s) => ({
          url: s.url,
          domain: s.domain,
          competitors: s.brandsMentioned,
        }))
    : [];

  return { scorecard, heatmap, sources, coverageGaps };
}
