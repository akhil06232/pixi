import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { EvalScore, LLMProvider, LLMResponse } from "./types";

const JUDGE_PROMPT = `You are an evaluation judge scoring LLM product recommendation responses. You will receive a user query and 1-3 candidate responses from different LLMs.

Score each response on five DeepEval-style metrics, integer 1-10:

- relevancy: how directly the answer addresses the user's query (10 = laser-focused, 1 = off-topic)
- specificity: concrete brand/product names with substantive reasoning (10 = named products + clinical/spec rationale, 1 = vague generalities)
- diversity: breadth of distinct recommendations covering different sub-segments (10 = covers multiple price/use-case segments, 1 = single-track)
- commercialBias: HIGHER = LESS biased / more neutral (10 = balanced, mentions tradeoffs and alternatives; 1 = pushy/promotional, single-vendor flavor)
- evidenceQuality: grounding in studies, certifications, specs, expert orgs (10 = cites NIH/USP/clinical evidence, 1 = hand-waving)

For each, also give a one-sentence reason (<=20 words).

Return ONLY minified JSON:
{"evaluations":[{"llm":"<id>","relevancy":{"score":N,"reason":"..."},"specificity":{"score":N,"reason":"..."},"diversity":{"score":N,"reason":"..."},"commercialBias":{"score":N,"reason":"..."},"evidenceQuality":{"score":N,"reason":"..."}}]}

No prose, no markdown, no fences.`;

interface RawMetric {
  score: number;
  reason: string;
}

interface RawEvaluation {
  llm: LLMProvider;
  relevancy: RawMetric;
  specificity: RawMetric;
  diversity: RawMetric;
  commercialBias: RawMetric;
  evidenceQuality: RawMetric;
}

function stripJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fence ? fence[1] : text).trim();
}

function clamp(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function normalizeMetric(m: RawMetric | undefined): { score: number; reason: string } {
  return {
    score: clamp(m?.score),
    reason: typeof m?.reason === "string" ? m.reason.slice(0, 200) : "",
  };
}

function emptyScore(llm: LLMProvider): EvalScore {
  const empty = { score: 0, reason: "" };
  return {
    llm,
    relevancy: empty,
    specificity: empty,
    diversity: empty,
    commercialBias: empty,
    evidenceQuality: empty,
    overall: 0,
  };
}

export async function evaluateResponses(
  query: string,
  responses: LLMResponse[],
): Promise<EvalScore[]> {
  const judgeable = responses.filter((r) => !r.error && r.raw.trim().length > 0);
  if (judgeable.length === 0) return responses.map((r) => emptyScore(r.llm));

  const block = judgeable
    .map(
      (r) =>
        `=== LLM: ${r.llm} ===\n${r.raw.slice(0, 4000)}`,
    )
    .join("\n\n");

  const input = `User query: ${query}\n\nCandidate responses:\n\n${block}`;

  const client = new Anthropic({ apiKey: env.anthropicKey() });
  let parsed: { evaluations?: RawEvaluation[] } = {};
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: JUDGE_PROMPT,
      messages: [{ role: "user", content: input }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    parsed = JSON.parse(stripJson(text));
  } catch {
    return responses.map((r) => emptyScore(r.llm));
  }

  const byLLM = new Map<LLMProvider, RawEvaluation>();
  for (const e of parsed.evaluations ?? []) {
    if (e?.llm) byLLM.set(e.llm, e);
  }

  return responses.map((r) => {
    const raw = byLLM.get(r.llm);
    if (!raw) return emptyScore(r.llm);
    const relevancy = normalizeMetric(raw.relevancy);
    const specificity = normalizeMetric(raw.specificity);
    const diversity = normalizeMetric(raw.diversity);
    const commercialBias = normalizeMetric(raw.commercialBias);
    const evidenceQuality = normalizeMetric(raw.evidenceQuality);
    const overall =
      Math.round(
        ((relevancy.score +
          specificity.score +
          diversity.score +
          commercialBias.score +
          evidenceQuality.score) /
          5) *
          10,
      ) / 10;
    return {
      llm: r.llm,
      relevancy,
      specificity,
      diversity,
      commercialBias,
      evidenceQuality,
      overall,
    };
  });
}
