import type { EvalScore, LLMProvider } from "@/lib/types";

const llmLabel: Record<LLMProvider, string> = {
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
};

const METRICS: Array<{ key: keyof Omit<EvalScore, "llm" | "overall">; label: string }> = [
  { key: "relevancy", label: "Relevancy" },
  { key: "specificity", label: "Specificity" },
  { key: "diversity", label: "Diversity" },
  { key: "commercialBias", label: "Bias-free" },
  { key: "evidenceQuality", label: "Evidence" },
];

const llmColor: Record<LLMProvider, string> = {
  claude: "bg-orange-500",
  gpt: "bg-emerald-500",
  gemini: "bg-blue-500",
};

function bestPerMetric(evals: EvalScore[]) {
  const winner = new Map<string, LLMProvider>();
  for (const m of METRICS) {
    let max = -1;
    let who: LLMProvider | null = null;
    for (const e of evals) {
      const score = e[m.key].score;
      if (score > max) {
        max = score;
        who = e.llm;
      }
    }
    if (who) winner.set(m.key, who);
  }
  return winner;
}

export function EvalPanel({ evals }: { evals: EvalScore[] }) {
  const active = evals.filter((e) => e.overall > 0);
  const winners = bestPerMetric(active);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <header className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold">LLM evaluation (DeepEval-style)</h2>
        <p className="text-xs text-zinc-500">
          Claude as judge — scored 1-10 on 5 quality metrics
        </p>
      </header>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {evals.map((e) => (
            <div
              key={e.llm}
              className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{llmLabel[e.llm]}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {e.overall.toFixed(1)}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                Overall
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4 font-medium">Metric</th>
                {evals.map((e) => (
                  <th key={e.llm} className="py-2 pr-4 font-medium">
                    {llmLabel[e.llm]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <tr
                  key={m.key}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="py-2 pr-4 font-medium align-top">{m.label}</td>
                  {evals.map((e) => {
                    const metric = e[m.key];
                    const isWinner = winners.get(m.key) === e.llm && metric.score > 0;
                    return (
                      <td key={e.llm} className="py-2 pr-4 align-top">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 max-w-[100px] rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full ${llmColor[e.llm]} ${isWinner ? "" : "opacity-60"}`}
                              style={{ width: `${metric.score * 10}%` }}
                            />
                          </div>
                          <span
                            className={`tabular-nums text-xs ${isWinner ? "font-bold" : ""}`}
                          >
                            {metric.score}
                          </span>
                        </div>
                        {metric.reason && (
                          <div className="text-[10px] text-zinc-500 mt-1 leading-tight">
                            {metric.reason}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
