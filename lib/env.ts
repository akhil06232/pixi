import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  anthropicKey: () => required("ANTHROPIC_API_KEY"),
  openaiKey: () => required("OPENAI_API_KEY"),
  geminiKey: () => required("GEMINI_API_KEY"),
  serperKey: () => required("SERPER_API_KEY"),
};
