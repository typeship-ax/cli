/** Identity comes from the authenticated API response, including opaque-token APIs. */
export type IdentityKind = "subject" | "account" | "organization";
export type IdentityPolicy = Partial<Record<IdentityKind, string>>;
export type ApiIdentity = Partial<Record<IdentityKind, string | null>>;
export interface VerifiedIdentity { values: ApiIdentity; checkedAt: string }
export interface IdentityConfiguration { operation: string; fields: IdentityPolicy }

export function validateIdentityPointer(pointer: unknown): asserts pointer is string {
  if (typeof pointer !== "string" || !pointer.startsWith("/") || pointer.length > 512 || /[\x00-\x1f\x7f]/.test(pointer) || /~(?:[^01]|$)/.test(pointer)) {
    throw new Error("Identity fields must be JSON Pointers starting with /, at most 512 characters, with ~0 and ~1 escapes.");
  }
}

export function identityPolicyOf(auth: { identitySubject?: string | null; identityAccount?: string | null; identityOrganization?: string | null } = {}): IdentityPolicy {
  const entries = [["subject", auth.identitySubject], ["account", auth.identityAccount], ["organization", auth.identityOrganization]] as const;
  const policy: IdentityPolicy = {};
  for (const [kind, pointer] of entries) if (pointer !== undefined && pointer !== null) { validateIdentityPointer(pointer); policy[kind] = pointer; }
  return policy;
}

export function readApiIdentity(data: unknown, policy: IdentityPolicy): ApiIdentity {
  const result: ApiIdentity = {};
  if (!Object.keys(policy).length) throw new Error("Configure at least one identity field before verifying a session.");
  for (const [kind, pointer] of Object.entries(policy) as [IdentityKind, string][]) {
    validateIdentityPointer(pointer);
    let value: unknown = data;
    for (const part of pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) throw new Error("The API identity response is missing a configured field. Check the identity field mapping.");
      value = (value as Record<string, unknown>)[part];
    }
    if (value === null && kind === "organization") result[kind] = null;
    else if ((typeof value === "string" && value.length > 0 && value.length <= 512 && !/[\x00-\x1f\x7f]/.test(value)) || (typeof value === "number" && Number.isSafeInteger(value))) result[kind] = String(value);
    else throw new Error("The API identity field must return a nonempty ID string or safe integer. Only an organization may be null.");
  }
  return result;
}

export function assertApiIdentity(expected: ApiIdentity, actual: ApiIdentity): void {
  if (!Object.keys(expected).length || Object.entries(expected).some(([key, value]) => !Object.hasOwn(actual, key) || actual[key as IdentityKind] !== value)) {
    throw new Error("The authenticated account, subject or organization does not match this login. Sign in again with the intended account and organization.");
  }
}

/** No redirects, bounded decoded response, and one deadline including body reads. */
export function identityFetch(apiBaseUrl: string): typeof fetch {
  const base = new URL(apiBaseUrl);
  if ((base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) || base.username || base.password || base.search || base.hash) throw new Error("Identity verification requires an HTTPS API URL; loopback HTTP is allowed for development.");
  const basePath = base.pathname.replace(/\/+$/, "");
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== base.origin || (url.pathname !== basePath && !url.pathname.startsWith(basePath + "/")) || url.username || url.password || url.hash) throw new Error("The identity read must stay on the configured API.");
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10_000);
    try {
      const signal = init?.signal ? AbortSignal.any([init.signal, abort.signal]) : abort.signal;
      const response = await fetch(input, { ...init, redirect: "error", signal });
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) {
        try {
          while (true) {
            const chunk = await reader.read(); if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > 1_048_576) { abort.abort(); throw new Error(); }
            chunks.push(chunk.value);
          }
        } finally { reader.releaseLock(); }
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return new Response([204, 205, 304].includes(response.status) ? null : bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch { throw new Error("The API identity read failed. Check the API URL, connectivity and response size before signing in again."); }
    finally { clearTimeout(timeout); }
  };
}

type IdentityResult = { ok: boolean; data?: unknown; error?: { status?: number } };
export async function identityResult(client: unknown, operation: { resource: string; method: string }): Promise<IdentityResult> {
  const target = (client as Record<string, Record<string, () => Promise<unknown>>>)[operation.resource];
  if (!target?.[operation.method]) throw new Error("The configured identity operation is not available in this package.");
  try {
    return { ok: true, data: await target[operation.method]!() };
  } catch (error) {
    return { ok: false, error: error as { status?: number } };
  }
}

export function verifyClientIdentity(createClient: (options: Record<string, unknown>) => unknown, options: Record<string, unknown>, operation: { resource: string; method: string }, policy: IdentityPolicy, expected?: ApiIdentity): Promise<VerifiedIdentity> {
  if (typeof options.baseUrl !== "string") throw new Error("Configure the API base URL before verifying identity.");
  const shared = { baseUrl: options.baseUrl, environment: options.environment, fetch: identityFetch(options.baseUrl), maxRetries: 0, timeoutMs: 10_000 };
  return verifyApiIdentity((anonymous) => identityResult(createClient(anonymous ? shared : { ...options, ...shared }), operation), policy, expected);
}
export async function verifyApiIdentity(read: (anonymous: boolean) => Promise<IdentityResult>, policy: IdentityPolicy, expected?: ApiIdentity): Promise<VerifiedIdentity> {
  let anonymous: IdentityResult, authenticated: IdentityResult;
  try { anonymous = await read(true); } catch { throw new Error("Could not verify that the identity read rejects anonymous access."); }
  if (anonymous.ok || ![401, 403].includes(anonymous.error?.status ?? 0)) throw new Error("The identity read must reject anonymous access with 401 or 403 before login can be verified.");
  try { authenticated = await read(false); } catch { throw new Error("The API identity read failed with the new credential. Check the API configuration and granted permissions."); }
  if (!authenticated.ok) throw new Error("The API did not accept the new login credential for its identity read. Check the audience, scopes and account access.");
  const values = readApiIdentity(authenticated.data, policy);
  if (expected) assertApiIdentity(expected, values);
  return { values, checkedAt: new Date().toISOString() };
}
