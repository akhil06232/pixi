import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env";
import type { BrandRanking, LLMProvider, LLMResponse, Sentiment } from "./types";

const SYSTEM_PROMPT =
  "You are a helpful product recommendation assistant. When the user asks for product recommendations, list 5-10 specific brand/product names with brief reasoning for each. Be concrete and use real brand names.";

const META_PROMPT = `You will be given a product recommendation response. Extract every brand or product name mentioned, in the order they appear. For each, return:
- brand: the brand/product name (canonical, no boilerplate)
- rank: ordinal position (1 = first/most-recommended)
- sentiment: "positive" | "neutral" | "negative"
- context: a short phrase (<=15 words) describing why it was mentioned

Return ONLY valid minified JSON of shape {"brands": BrandRanking[]}. No prose, no markdown, no code fences.`;

async function queryClaude(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: env.anthropicKey() });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function queryGPT(prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: env.openaiKey() });
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });
  return resp.choices[0]?.message?.content ?? "";
}

async function queryGemini(prompt: string): Promise<string> {
  const client = new GoogleGenerativeAI(env.geminiKey());
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function stripJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fence ? fence[1] : text).trim();
}

async function extractBrands(raw: string): Promise<BrandRanking[]> {
  if (!raw.trim()) return [];
  const client = new Anthropic({ apiKey: env.anthropicKey() });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: META_PROMPT,
    messages: [{ role: "user", content: raw }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    const parsed = JSON.parse(stripJson(text)) as { brands?: BrandRanking[] };
    return (parsed.brands ?? []).map((b, i) => ({
      brand: String(b.brand).trim(),
      rank: Number(b.rank) || i + 1,
      sentiment: (["positive", "neutral", "negative"] as Sentiment[]).includes(b.sentiment)
        ? b.sentiment
        : "neutral",
      context: b.context?.toString().slice(0, 200),
    }));
  } catch {
    return [];
  }
}

interface ProviderConfig {
  llm: LLMProvider;
  query: (prompt: string) => Promise<string>;
}

const providers: ProviderConfig[] = [
  { llm: "claude", query: queryClaude },
  { llm: "gpt", query: queryGPT },
  { llm: "gemini", query: queryGemini },
];

async function runProvider(p: ProviderConfig, prompt: string): Promise<LLMResponse> {
  try {
    const raw = await p.query(prompt);
    const rankings = await extractBrands(raw);
    return {
      llm: p.llm,
      raw,
      rankings,
      brands: rankings.map((r) => r.brand),
    };
  } catch (e) {
    return {
      llm: p.llm,
      raw: "",
      rankings: [],
      brands: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function queryAllLLMs(prompt: string): Promise<LLMResponse[]> {
  return Promise.all(providers.map((p) => runProvider(p, prompt)));
}
