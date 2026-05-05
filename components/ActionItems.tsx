import type { ActionItems as ActionItemsType } from "@/lib/types";

const llmLabel: Record<string, string> = {
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
};

export function ActionItems({
  actions,
  userBrand,
}: {
  actions: ActionItemsType;
  userBrand: string | null;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <header className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold">Action items</h2>
        <p className="text-xs text-zinc-500">What to do next</p>
      </header>
      <div className="p-4 space-y-5 text-sm">
        {userBrand && (
          <div>
            <h3 className="font-medium mb-2">
              Get listed on these competitor-rich pages
            </h3>
            {actions.coverageGaps.length === 0 ? (
              <p className="text-zinc-500">
                No coverage gaps detected — you're appearing where competitors are.
              </p>
            ) : (
              <ul className="space-y-2">
                {actions.coverageGaps.map((g) => (
                  <li
                    key={g.url}
                    className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2"
                  >
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline decoration-zinc-300"
                    >
                      {g.domain}
                    </a>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Lists: {g.competitors.slice(0, 6).join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <h3 className="font-medium mb-2">Content angles to create</h3>
          {actions.contentAngles.length === 0 ? (
            <p className="text-zinc-500">No angles synthesized.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
              {actions.contentAngles.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>

        {userBrand && actions.sentimentIssues.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Sentiment issues to address</h3>
            <ul className="space-y-2">
              {actions.sentimentIssues.map((s, i) => (
                <li
                  key={i}
                  className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10 px-3 py-2"
                >
                  <div className="font-medium">{s.topic}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {llmLabel[s.llm]} · {s.note}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
