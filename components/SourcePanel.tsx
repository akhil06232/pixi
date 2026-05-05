import type { AttributedSource } from "@/lib/types";

const llmLabel: Record<string, string> = {
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
};

const typeColor: Record<string, string> = {
  review: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  listicle: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  study: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  forum: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  retailer: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  brand: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  news: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function SourcePanel({
  sources,
  userBrand,
}: {
  sources: AttributedSource[];
  userBrand: string | null;
}) {
  const top = sources.slice(0, 15);
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <header className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold">Source attribution</h2>
        <p className="text-xs text-zinc-500">
          Pages most likely shaping LLM answers, ranked by influence
        </p>
      </header>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {top.map((s) => (
          <li key={s.url} className="px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium underline decoration-zinc-300 hover:decoration-zinc-700 break-words"
                >
                  {s.title}
                </a>
                <div className="text-xs text-zinc-500 mt-0.5">{s.domain}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Brands: {s.brandsMentioned.slice(0, 6).join(", ")}
                  {s.brandsMentioned.length > 6
                    ? ` +${s.brandsMentioned.length - 6}`
                    : ""}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Influences: {s.llmsInfluenced.map((l) => llmLabel[l]).join(", ") || "—"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColor[s.type]}`}
                >
                  {s.type}
                </span>
                <span className="text-[10px] text-zinc-500">
                  authority {s.authorityHint}
                </span>
                {userBrand &&
                  (s.userBrandPresent ? (
                    <span className="text-[10px] text-emerald-600">
                      ✓ you appear
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600">✗ missing</span>
                  ))}
              </div>
            </div>
          </li>
        ))}
        {top.length === 0 && (
          <li className="px-4 py-6 text-sm text-zinc-500">No attributed sources.</li>
        )}
      </ul>
    </section>
  );
}
