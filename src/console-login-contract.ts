
export interface ConsoleLoginConfiguration {
  baseUrl: string;
  environment: string | null;
  operation: string;
  request: { method: string; path: string; graphqlField: string | null; graphqlQuery: string | null };
  requirements: Record<string, string[]>[];
  issuer: string;
  clientId: string;
  discoveryUrl: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  redirectUri: string;
  scopes: string[];
  audience: string | null;
  resource: string | null;
}
export interface ConsoleIdentityExpectation {
  kind: "account" | "organization" | "user";
  pointer: string;
  expected: string | number;
}
export interface ConsoleLoginCheck {
  version: 1;
  endpoint: string;
  ticket: string;
  expiresAt: string;
  configuration: ConsoleLoginConfiguration;
  expectations: ConsoleIdentityExpectation[];
}
export interface ConsoleBrowserEvidence {
  method: "oauth_browser";
  issuer: string;
  clientId: string;
  redirectUri: string;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}

/** Compare the generated product's own settings with the reviewed check.
 * The downloaded file never supplies the CLI's OAuth or API destination. */
export function sameConsoleLoginConfiguration(left: ConsoleLoginConfiguration, right: ConsoleLoginConfiguration): boolean {
  const normalize = (value: ConsoleLoginConfiguration) => ({ ...value,
    baseUrl: new URL(value.baseUrl).href,
    scopes: [...new Set(value.scopes)].sort(),
    requirements: value.requirements.map((entry) => Object.fromEntries(Object.entries(entry).map(([key, scopes]) => [key, [...new Set(scopes)].sort()]))),
  });
  try { return canonical(normalize(left)) === canonical(normalize(right)); } catch { return false; }
}

export function matchesConsoleBrowserEvidence(config: ConsoleLoginConfiguration, evidence: ConsoleBrowserEvidence): boolean {
  try {
    if (evidence.method !== "oauth_browser" || evidence.issuer !== config.issuer || evidence.clientId !== config.clientId) return false;
    const configured = new URL(config.redirectUri), actual = new URL(evidence.redirectUri);
    if (configured.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(configured.hostname) || configured.username || configured.password || configured.search || configured.hash) return false;
    if (configured.port && configured.port !== actual.port) return false;
    if (!actual.port) return false;
    configured.port = actual.port;
    return configured.href === actual.href;
  } catch { return false; }
}
