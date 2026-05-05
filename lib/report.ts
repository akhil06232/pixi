import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import { attributeSources } from "./attribution";
import { evaluateResponses } from "./eval";
import type {
  ActionItems,
  DiagnosticReport,
  LLMResponse,
  SearchResult,
} from "./types";

const SYNTH_PROMPT = `You are an SEO/AEO strategist. Given the data, produce ONLY minified JSON of shape:
{"contentAngles": string[], "sentimentIssues": [{"topic": string, "llm": "claude"|"gpt"|"gemini", "note": string}]}

- contentAngles: 3-5 specific content angles driving LLM recommendations of competitors. Concrete, not generic.
- sentimentIssues: only entries where the user's brand is mentioned with negative or mixed sentiment. Empty array if none. "topic" is the criticism (e.g., "absorption rate concerns"), "note" is one short sentence on how to address.

No prose, no markdown, no fences.`;

interface SynthOutput {
  contentAngles: string[];
  sentimentIssues: ActionItems["sentimentIssues"];
}

function stripJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fence ? fence[1] : text).trim();
}

async function synthesize(
  query: string,
  userBrand: string | null,
  llmResponses: LLMResponse[],
): Promise<SynthOutput> {
  const condensed = llmResponses
    .map(
      (r) =>
        `--- ${r.llm.toUpperCase()} ---\n${r.raw.slice(0, 4000)}\n(brands: ${r.brands.join(", ")})`,
    )
    .join("\n\n");
  const userLine = userBrand ? `User brand: ${userBrand}` : "User brand: (none)";
  const input = `Query: ${query}\n${userLine}\n\nLLM responses:\n${condensed}`;

  const client = new Anthropic({ apiKey: env.anthropicKey() });
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYNTH_PROMPT,
      messages: [{ role: "user", content: input }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = JSON.parse(stripJson(text)) as Partial<SynthOutput>;
    return {
      contentAngles: Array.isArray(parsed.contentAngles) ? parsed.contentAngles : [],
      sentimentIssues: Array.isArray(parsed.sentimentIssues)
        ? parsed.sentimentIssues
        : [],
    };
  } catch {
    return { contentAngles: [], sentimentIssues: [] };
  }
}

export async function generateReport(args: {
  query: string;
  userBrand: string | null;
  llmResponses: LLMResponse[];
  searchResults: SearchResult[];
}): Promise<DiagnosticReport> {
  const { query, userBrand, llmResponses, searchResults } = args;
  const attribution = attributeSources(llmResponses, searchResults, userBrand);
  const [synth, evals] = await Promise.all([
    synthesize(query, userBrand, llmResponses),
    evaluateResponses(query, llmResponses),
  ]);
  return {
    query,
    userBrand,
    generatedAt: new Date().toISOString(),
    scorecard: attribution.scorecard,
    heatmap: attribution.heatmap,
    sources: attribution.sources,
    actions: {
      coverageGaps: attribution.coverageGaps,
      contentAngles: synth.contentAngles,
      sentimentIssues: synth.sentimentIssues,
    },
    evals,
    llmResponses,
  };
}
