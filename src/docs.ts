/** Shared documentation-fetch boundary for generated CLI and MCP surfaces. */

export const MAX_DOCS_TEXT_BYTES = 2_000_000;

export function resolveDocsPageUrl(base: string | null, pathOrFile: string): string | null {
  if (base === null) return null;
  try {
    const baseUrl = new URL(base);
    if ((baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") || baseUrl.username || baseUrl.password) return null;
    const target = /^https?:\/\//.test(pathOrFile)
      ? new URL(pathOrFile)
      : new URL(pathOrFile.replace(/^\/+/, ""), baseUrl.toString().replace(/\/+$/, "") + "/");
    return target.origin === baseUrl.origin && !target.username && !target.password ? target.toString() : null;
  } catch {
    return null;
  }
}

/** Resolve conventional docs files while honoring an explicitly configured
 * llms.txt location. Guide links may live on either the docs-site origin or
 * the index origin; no other origin is accepted. */
export function resolveDocsContentUrl(
  base: string | null,
  indexUrl: string | null,
  pathOrFile: string,
): string | null {
  const exactIndex = safeHttpUrl(indexUrl);
  if (pathOrFile === "llms.txt" && exactIndex) return exactIndex;
  if (pathOrFile === "llms-full.txt" && exactIndex) {
    try { return new URL("llms-full.txt", exactIndex).toString(); } catch { return null; }
  }
  const primary = resolveDocsPageUrl(base, pathOrFile);
  if (primary) return primary;
  if (!exactIndex) return null;
  try {
    const target = /^https?:\/\//.test(pathOrFile)
      ? new URL(pathOrFile)
      : new URL(pathOrFile.replace(/^\/+/, ""), exactIndex);
    const allowed = new URL(exactIndex);
    return target.origin === allowed.origin && !target.username && !target.password ? target.toString() : null;
  } catch {
    return null;
  }
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export interface GuideMatch {
  title: string;
  section: string | null;
  /** Kept for callers that displayed the original heading-only results. */
  heading: string;
  excerpt: string;
  url: string;
}

interface GuidePage { title: string; url: string; description: string }

/** Links in an index follow URL semantics, including site-root relative links. */
function docsLink(base: string | null, indexUrl: string | null, value: string): string | null {
  const index = resolveDocsContentUrl(base, indexUrl, "llms.txt");
  if (!index) return null;
  try { return resolveDocsContentUrl(base, indexUrl, new URL(value, index).toString()); }
  catch { return null; }
}

export function docsIndexPages(index: string | null, base: string | null, indexUrl: string | null): GuidePage[] {
  const pages = new Map<string, GuidePage>();
  for (const line of (index ?? "").split("\n")) {
    for (const match of line.matchAll(/\[([^\]]+)\]\(([^\s)]+)\)/g)) {
      const url = docsLink(base, indexUrl, match[2]!);
      if (!url || /\/llms(?:-full)?\.txt(?:[?#]|$)/.test(url)) continue;
      const description = line.slice(match.index! + match[0].length).replace(/^\s*:\s*/, "").trim();
      if (!pages.has(url)) pages.set(url, { title: match[1]!, url, description: cleanDocsText(description) });
    }
  }
  return [...pages.values()];
}

function cleanDocsText(text: string): string {
  return text.replace(/^\s*(?:>\s*)+/, "").replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]*>/g, "").replace(/[*`]/g, "").replace(/^\s*[-*>]\s*/, "").replace(/\s+/g, " ").trim();
}

function docsTerms(query: string): string[] {
  return [...new Set(query.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 2))];
}

/** Rank sections, then keep the strongest section of each real page. A heading
 * match must have content: blank lines, fences, and source markers are not hits. */
export function searchGuidePages(
  prose: string | null, index: string | null, base: string | null, indexUrl: string | null, query: string,
): GuideMatch[] {
  const pages = docsIndexPages(index, base, indexUrl);
  const terms = docsTerms(query);
  if (terms.length === 0) return [];
  const phrase = query.trim().toLowerCase();
  const candidates: { match: GuideMatch; score: number }[] = [];
  const add = (title: string, section: string | null, url: string | null, lines: string[]) => {
    if (!url) return;
    const content = lines.map(cleanDocsText).filter((line) => line.length > 0);
    if (content.length === 0) return;
    const heading = (title + " " + (section ?? "")).toLowerCase();
    const body = content.join(" ").toLowerCase();
    const matched = terms.filter((term) => heading.includes(term) || body.includes(term));
    if (matched.length === 0) return;
    const score = matched.length * 10 + (matched.length === terms.length ? 50 : 0)
      + (heading.includes(phrase) ? 35 : body.includes(phrase) ? 25 : 0)
      + (title.toLowerCase().includes(phrase) ? 25 : 0)
      + terms.filter((term) => title.toLowerCase().includes(term)).length * 5
      + terms.filter((term) => heading.includes(term)).length * 5
      + terms.filter((term) => section?.toLowerCase().includes(term)).length * 3;
    const excerpt = [...content].sort((a, b) => {
      const rank = (line: string) => terms.filter((term) => line.toLowerCase().includes(term)).length;
      return rank(b) - rank(a);
    })[0]!.slice(0, 240);
    candidates.push({ match: { title, section, heading: section ?? title, excerpt, url }, score });
  };
  let title = "";
  let section: string | null = null;
  let url: string | null = null;
  let lines: string[] = [];
  let fence: string | null = null;
  const flush = () => { add(title, section, url, lines); lines = []; };
  for (const line of (prose ?? "").split("\n")) {
    const fenced = line.trim().match(/^(`{3,}|~{3,})/);
    if (fenced) { if (fence === null) fence = fenced[1]![0]!; else if (fenced[1]![0] === fence) fence = null; continue; }
    if (fence !== null) { if (line.trim()) lines.push(line); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      flush();
      if (heading[1] === "#") {
        title = cleanDocsText(heading[2]!);
        section = null;
        const link = heading[2]!.match(/\[[^\]]+\]\(([^\s)]+)\)/);
        url = link ? docsLink(base, indexUrl, link[1]!) : pages.find((page) => page.title.toLowerCase() === title.toLowerCase())?.url ?? null;
      } else section = cleanDocsText(heading[2]!);
      continue;
    }
    const source = line.match(/^Source:\s*(?:\[[^\]]*\]\()?<?(https?:\/\/[^\s)>]+)>?\)?\s*$/i);
    if (source) {
      url = docsLink(base, indexUrl, source[1]!);
      continue;
    }
    // Markdown callouts are blockquotes; keep their text for search and excerpts.
    if (!line.trim() || /^\s*(?:---+|\|[\s:|-]+\|)\s*$/.test(line) || /^\s*</.test(line)) continue;
    lines.push(line);
  }
  flush();
  // An index is useful without llms-full.txt, and may include additional pages.
  const described = new Set(candidates.map(({ match }) => match.url.replace(/\.md(?=[?#]|$)/, "")));
  for (const page of pages) {
    if (!described.has(page.url.replace(/\.md(?=[?#]|$)/, ""))) add(page.title, null, page.url, [page.description || page.title]);
  }
  candidates.sort((a, b) => b.score - a.score || a.match.title.localeCompare(b.match.title) || a.match.url.localeCompare(b.match.url));
  const distinct = new Map<string, GuideMatch>();
  for (const { match } of candidates) {
    const key = match.url.replace(/\.md(?=[?#]|$)/, "");
    if (!distinct.has(key)) distinct.set(key, match);
  }
  return [...distinct.values()];
}

export async function searchConnectedGuides(
  base: string | null, indexUrl: string | null, fetchText: (path: string) => Promise<string | null>, query: string,
): Promise<{ guides: GuideMatch[]; status: "not_configured" | "unavailable" | "ok" }> {
  if (!base && !indexUrl) return { guides: [], status: "not_configured" };
  const [index, prose] = await Promise.all([fetchText("llms.txt"), fetchText("llms-full.txt")]);
  return { guides: searchGuidePages(prose, index, base, indexUrl, query), status: index === null && prose === null ? "unavailable" : "ok" };
}

export function docsReadTarget(index: string | null, base: string | null, indexUrl: string | null, page: string): string {
  if (/^https?:\/\//.test(page)) return page;
  const pages = docsIndexPages(index, base, indexUrl);
  const term = page.toLowerCase();
  const exact = pages.find((item) => item.title.toLowerCase() === term || new URL(item.url).pathname.toLowerCase() === term);
  if (exact) return exact.url;
  const matches = pages.filter((item) => item.url.toLowerCase().includes(term));
  return matches.length === 1 ? matches[0]!.url : page;
}

/** One shell argument, including URLs with quotes, query strings, or fragments. */
export function docsReadCommand(bin: string, url: string): string {
  return bin + " docs read '" + url.replace(/'/g, "'\\''") + "'";
}

/** Markdown-preferred fetch with same-origin redirects, one deadline, and a
 * streaming byte cap. Returns null for every invalid or failed read. */
export async function fetchDocsText(url: string): Promise<string | null> {
  try {
    const initial = new URL(url);
    if ((initial.protocol !== "https:" && initial.protocol !== "http:") || initial.username || initial.password) return null;
    const allowedOrigin = initial.origin;
    let current = initial.toString();
    const signal = AbortSignal.timeout(10_000);
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const response = await fetch(current, { headers: { Accept: "text/markdown, text/plain, */*" }, redirect: "manual", signal });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === 3) return null;
        const next = new URL(location, current);
        if (next.origin !== allowedOrigin || next.username || next.password) return null;
        current = next.toString();
        continue;
      }
      if (!response.ok) return null;
      const declared = Number(response.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_DOCS_TEXT_BYTES) return null;
      if (!response.body) return "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      let text = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_DOCS_TEXT_BYTES) {
          await reader.cancel();
          return null;
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      return text + decoder.decode();
    }
    return null;
  } catch {
    return null;
  }
}
