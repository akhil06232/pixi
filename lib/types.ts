export type LLMProvider = "claude" | "gpt" | "gemini";

export type Sentiment = "positive" | "neutral" | "negative";

export interface BrandRanking {
  brand: string;
  rank: number;
  sentiment: Sentiment;
  context?: string;
}

export interface LLMResponse {
  llm: LLMProvider;
  raw: string;
  brands: string[];
  rankings: BrandRanking[];
  error?: string;
}

export interface SearchResult {
  position: number;
  title: string;
  snippet: string;
  url: string;
  domain: string;
  content?: string;
  brandsFound?: string[];
}

export type SourceType =
  | "review"
  | "listicle"
  | "study"
  | "forum"
  | "retailer"
  | "brand"
  | "news"
  | "other";

export interface AttributedSource {
  url: string;
  domain: string;
  title: string;
  type: SourceType;
  authorityHint: number;
  brandsMentioned: string[];
  llmsInfluenced: LLMProvider[];
  userBrandPresent: boolean;
}

export interface ScorecardRow {
  llm: LLMProvider;
  mentionedUserBrand: boolean;
  userBrandRank: number | null;
  userBrandSentiment: Sentiment | null;
  competitors: string[];
}

export interface HeatmapCell {
  brand: string;
  llm: LLMProvider;
  rank: number | null;
  sentiment: Sentiment | null;
}

export interface ActionItems {
  coverageGaps: Array<{ url: string; domain: string; competitors: string[] }>;
  contentAngles: string[];
  sentimentIssues: Array<{ topic: string; llm: LLMProvider; note: string }>;
}

export interface EvalMetric {
  score: number;
  reason: string;
}

export interface EvalScore {
  llm: LLMProvider;
  relevancy: EvalMetric;
  specificity: EvalMetric;
  diversity: EvalMetric;
  commercialBias: EvalMetric;
  evidenceQuality: EvalMetric;
  overall: number;
}

export interface DiagnosticReport {
  query: string;
  userBrand: string | null;
  generatedAt: string;
  scorecard: ScorecardRow[];
  heatmap: HeatmapCell[];
  sources: AttributedSource[];
  actions: ActionItems;
  evals: EvalScore[];
  llmResponses: LLMResponse[];
}

export interface DiagnosticRequest {
  query: string;
  userBrand?: string;
}
