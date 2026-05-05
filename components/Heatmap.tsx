import type { HeatmapCell, LLMProvider } from "@/lib/types";

const LLMS: LLMProvider[] = ["claude", "gpt", "gemini"];
const llmLabel: Record<LLMProvider, string> = {
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
};

function cellStyle(cell: HeatmapCell | undefined): string {
  if (!cell || cell.rank === null) return "bg-zinc-100 dark:bg-zinc-900 text-zinc-400";
  if (cell.sentiment === "positive") return "bg-emerald-500/80 text-white";
  if (cell.sentiment === "negative") return "bg-rose-500/80 text-white";
  return "bg-amber-400/80 text-zinc-900";
}

export function Heatmap({ cells }: { cells: HeatmapCell[] }) {
  const brands = Array.from(new Set(cells.map((c) => c.brand)));
  const byBrandLLM = new Map<string, HeatmapCell>();
  for (const c of cells) byBrandLLM.set(`${c.brand}|${c.llm}`, c);

  const ranked = brands
    .map((b) => ({
      brand: b,
      hits: LLMS.reduce(
        (n, llm) =>
          n + (byBrandLLM.get(`${b}|${llm}`)?.rank !== null ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.brand);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <header className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold">Brand mention heatmap</h2>
        <p className="text-xs text-zinc-500">
          Green positive · Amber neutral · Red negative · Grey absent
        </p>
      </header>
      <div className="overflow-x-auto p-4">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 font-medium">Brand</th>
              {LLMS.map((l) => (
                <th key={l} className="px-2 py-1 font-medium text-center">
                  {llmLabel[l]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((brand) => (
              <tr key={brand}>
                <td className="px-2 py-1 pr-4 whitespace-nowrap">{brand}</td>
                {LLMS.map((llm) => {
                  const c = byBrandLLM.get(`${brand}|${llm}`);
                  return (
                    <td key={llm} className="px-1 py-1">
                      <div
                        className={`w-16 h-8 rounded flex items-center justify-center text-xs font-medium ${cellStyle(c)}`}
                        title={
                          c?.rank
                            ? `Rank ${c.rank}, ${c.sentiment ?? "neutral"}`
                            : "Not mentioned"
                        }
                      >
                        {c?.rank ? `#${c.rank}` : "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
