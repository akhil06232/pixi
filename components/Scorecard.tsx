import type { ScorecardRow } from "@/lib/types";

const llmLabel: Record<string, string> = {
  claude: "Claude",
  gpt: "GPT-4o-mini",
  gemini: "Gemini 2.0",
};

function sentimentColor(s: string | null): string {
  if (s === "positive") return "text-emerald-600";
  if (s === "negative") return "text-rose-600";
  if (s === "neutral") return "text-amber-600";
  return "text-zinc-400";
}

export function Scorecard({
  rows,
  userBrand,
}: {
  rows: ScorecardRow[];
  userBrand: string | null;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <header className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold">Scorecard</h2>
        <p className="text-xs text-zinc-500">
          {userBrand
            ? `How each engine ranks ${userBrand}`
            : "Top brands per engine"}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Engine</th>
              <th className="px-4 py-2 font-medium">Mentions you</th>
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Sentiment</th>
              <th className="px-4 py-2 font-medium">Top competitors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.llm}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-4 py-2 font-medium">{llmLabel[r.llm]}</td>
                <td className="px-4 py-2">
                  {userBrand ? (
                    r.mentionedUserBrand ? (
                      <span className="text-emerald-600">Yes</span>
                    ) : (
                      <span className="text-rose-600">No</span>
                    )
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {r.userBrandRank ?? <span className="text-zinc-400">—</span>}
                </td>
                <td className={`px-4 py-2 ${sentimentColor(r.userBrandSentiment)}`}>
                  {r.userBrandSentiment ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {r.competitors.slice(0, 5).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
