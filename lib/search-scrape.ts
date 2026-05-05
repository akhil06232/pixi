import "server-only";
import * as cheerio from "cheerio";
import { env } from "./env";
import type { SearchResult } from "./types";

const SERPER_URL = "https://google.serper.dev/search";
const FETCH_TIMEOUT_MS = 8000;
const MAX_CONTENT_CHARS = 12_000;
const TOP_N_FETCH = 10;

interface SerperOrganic {
  position: number;
  title: string;
  snippet?: string;
  link: string;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function fetchSerper(query: string, n: number): Promise<SearchResult[]> {
  const resp = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": env.serperKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: n }),
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`Serper ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as { organic?: SerperOrganic[] };
  return (data.organic ?? []).slice(0, n).map((o) => ({
    position: o.position,
    title: o.title,
    snippet: o.snippet ?? "",
    url: o.link,
    domain: domainOf(o.link),
  }));
}

async function fetchPageText(url: string): Promise<string | undefined> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AEO-Diagnostic/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!resp.ok) return undefined;
    const ct = resp.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return undefined;
    const html = await resp.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, iframe, nav, footer, header").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    return text.slice(0, MAX_CONTENT_CHARS);
  } catch {
    return undefined;
  }
}

export async function scrapeSearchResults(
  query: string,
  n: number,
): Promise<SearchResult[]> {
  const results = await fetchSerper(query, n);
  const fetchTargets = results.slice(0, TOP_N_FETCH);
  const contents = await Promise.all(fetchTargets.map((r) => fetchPageText(r.url)));
  for (let i = 0; i < fetchTargets.length; i++) {
    fetchTargets[i].content = contents[i];
  }
  return results;
}
