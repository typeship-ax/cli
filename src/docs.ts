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
