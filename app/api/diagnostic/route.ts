import { z } from "zod";
import { NextResponse } from "next/server";
import { queryAllLLMs } from "@/lib/llm-query";
import { scrapeSearchResults } from "@/lib/search-scrape";
import { generateReport } from "@/lib/report";

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  query: z.string().min(3).max(300),
  userBrand: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { query, userBrand } = parsed.data;

  try {
    const [llmResponses, searchResults] = await Promise.all([
      queryAllLLMs(query),
      scrapeSearchResults(query, 30),
    ]);

    const report = await generateReport({
      query,
      userBrand: userBrand?.trim() || null,
      llmResponses,
      searchResults,
    });

    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
