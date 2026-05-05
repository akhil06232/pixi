"use client";

import { useState } from "react";
import type { DiagnosticReport } from "@/lib/types";
import { Scorecard } from "./Scorecard";
import { Heatmap } from "./Heatmap";
import { EvalPanel } from "./EvalPanel";
import { SourcePanel } from "./SourcePanel";
import { ActionItems } from "./ActionItems";

const STAGES = [
  "Querying Claude…",
  "Querying GPT…",
  "Querying Gemini…",
  "Scraping Google top 30…",
  "Cross-referencing sources…",
  "Evaluating with Claude judge…",
  "Synthesizing report…",
];

type State =
  | { kind: "idle" }
  | { kind: "loading"; stage: number }
  | { kind: "error"; message: string }
  | { kind: "done"; report: DiagnosticReport };

export function DiagnosticForm() {
  const [query, setQuery] = useState("");
  const [userBrand, setUserBrand] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setState({ kind: "loading", stage: 0 });
    const interval = setInterval(() => {
      setState((s) =>
        s.kind === "loading" && s.stage < STAGES.length - 1
          ? { kind: "loading", stage: s.stage + 1 }
          : s,
      );
    }, 4000);

    try {
      const resp = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          userBrand: userBrand.trim() || undefined,
        }),
      });
      clearInterval(interval);
      if (!resp.ok) {
        const data = (await resp.json().catch(() => ({}))) as { error?: string };
        setState({
          kind: "error",
          message: data.error ?? `Request failed (${resp.status})`,
        });
        return;
      }
      const report = (await resp.json()) as DiagnosticReport;
      setState({ kind: "done", report });
    } catch (e) {
      clearInterval(interval);
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Answer Engine Optimization Diagnostic
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          See how Claude, GPT, and Gemini recommend products in your category — and
          what to do about it.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-950"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Ask about your product category
          </label>
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="best magnesium supplement for seniors"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
            disabled={state.kind === "loading"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Your brand{" "}
            <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={userBrand}
            onChange={(e) => setUserBrand(e.target.value)}
            placeholder="Acme Magnesium"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
            disabled={state.kind === "loading"}
          />
        </div>
        <button
          type="submit"
          disabled={state.kind === "loading" || !query.trim()}
          className="w-full sm:w-auto rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {state.kind === "loading" ? "Running…" : "Run diagnostic"}
        </button>
      </form>

      {state.kind === "loading" && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <ul className="space-y-1 text-sm">
            {STAGES.map((s, i) => (
              <li
                key={i}
                className={
                  i < state.stage
                    ? "text-zinc-400"
                    : i === state.stage
                      ? "text-zinc-900 dark:text-zinc-100 font-medium"
                      : "text-zinc-500"
                }
              >
                {i < state.stage ? "✓ " : i === state.stage ? "→ " : "  "}
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-900 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          <strong className="font-medium">Error:</strong> {state.message}
        </div>
      )}

      {state.kind === "done" && (
        <div className="space-y-6">
          <Scorecard
            rows={state.report.scorecard}
            userBrand={state.report.userBrand}
          />
          <Heatmap cells={state.report.heatmap} />
          <EvalPanel evals={state.report.evals} />
          <SourcePanel
            sources={state.report.sources}
            userBrand={state.report.userBrand}
          />
          <ActionItems
            actions={state.report.actions}
            userBrand={state.report.userBrand}
          />
        </div>
      )}
    </div>
  );
}
