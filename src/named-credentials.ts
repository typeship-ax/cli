import { openSync, readSync, closeSync } from "node:fs";

/** Runtime credentials keyed by the API's exact security-scheme names. */
export type NamedCredential = string | { username: string; password: string };
export type NamedCredentials = Record<string, NamedCredential>;
export type CredentialSchemes = Record<string, { kind: string; options: string[] }>;

export function parseNamedCredentials(value: unknown, schemes: CredentialSchemes): NamedCredentials {
  if (typeof value === "string") {
    if (new TextEncoder().encode(value).byteLength > 1_048_576) throw new Error("Named credentials exceed the 1 MiB limit.");
    try { value = JSON.parse(value); } catch { throw new Error("Named credentials must be a JSON object keyed by security scheme. Credential contents are not included in errors."); }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Named credentials must be a JSON object keyed by security scheme.");
  const result: NamedCredentials = Object.create(null);
  for (const [name, credential] of Object.entries(value)) {
    if (!Object.hasOwn(schemes, name)) throw new Error("Named credentials contain an unknown or unsupported security scheme. Check the names listed by login --help.");
    if (schemes[name]!.kind === "basic") {
      if (!credential || typeof credential !== "object" || Array.isArray(credential) || Object.keys(credential).some((key) => key !== "username" && key !== "password") ||
        typeof credential.username !== "string" || typeof credential.password !== "string" || !credential.username || !credential.password || credential.username.includes(":")) {
        throw new Error("A named Basic credential requires a nonempty username and password; the username cannot contain a colon.");
      }
      result[name] = { username: credential.username, password: credential.password };
    } else {
      if (typeof credential !== "string" || !credential || /[\x00-\x1f\x7f]/.test(credential) || (schemes[name]!.kind === "bearer" && credential.includes(" "))) throw new Error("A named token or API key must be a nonempty string without control characters; bearer tokens cannot contain spaces.");
      result[name] = credential;
    }
  }
  return result;
}

/** Low-to-high source order. Within a source, exact names beat convenience options. */
export function resolveNamedCredentials(schemes: CredentialSchemes, layers: { named?: NamedCredentials; options?: Record<string, unknown> }[]): NamedCredentials {
  const resolved: NamedCredentials = Object.create(null);
  for (const layer of layers) {
    for (const [name, scheme] of Object.entries(schemes)) {
      for (const option of scheme.options) {
        if (option === "clientCredentials") continue;
        const value = layer.options?.[option];
        if (value !== undefined) resolved[name] = value as NamedCredential;
      }
    }
    if (layer.named) Object.assign(resolved, parseNamedCredentials(layer.named, schemes));
  }
  return resolved;
}

/** Make convenience and named inputs comparable without expanding combinations. */
export function namedCredentialAvailability(schemes: CredentialSchemes, options: Set<string>, named: NamedCredentials): Set<string> {
  for (const [name, scheme] of Object.entries(schemes)) {
    if (Object.hasOwn(named, name) || scheme.options.some((option) => options.has(option))) options.add("credentials." + name);
  }
  return options;
}

/** The schemes an interactive OAuth login session authenticates by name. When
 * the API also declares a separate non-OAuth bearer scheme, the convenience
 * bearer token belongs to that scheme, so the session must be passed to each
 * OAuth scheme by name. Empty: the session is the convenience bearer token. */
export function oauthSessionSchemes(schemes: CredentialSchemes): string[] {
  return Object.entries(schemes).filter(([, scheme]) => scheme.options.includes("clientCredentials") && !scheme.options.includes("bearerToken")).map(([name]) => name);
}

/** Whether resolved client options satisfy one complete credential alternative
 * of an operation. Returns null when satisfied (or when no credential is
 * required); otherwise the named alternatives and the schemes each lacks. */
export function missingCredentials(schemes: CredentialSchemes, credentialOptions: string[][] | undefined, options: Record<string, unknown>): { alternatives: string[][]; missing: string[][] } | null {
  const supplied = (key: string, value: unknown): boolean => typeof value === "function" || (typeof value === "string" && value.length > 0)
    || (key === "clientCredentials" && value !== null && typeof value === "object")
    || (value !== null && typeof value === "object" && "username" in value && "password" in value && typeof value.username === "string" && value.username.length > 0 && typeof value.password === "string" && value.password.length > 0);
  const named = Object.fromEntries(Object.entries((options.credentials ?? {}) as Record<string, unknown>).filter(([name, value]) => supplied(name, value))) as NamedCredentials;
  const available = namedCredentialAvailability(schemes, new Set(Object.keys(options).filter((key) => key !== "credentials" && supplied(key, options[key]))), named);
  if (credentialOptions?.some((alternative) => alternative.length > 0 && alternative.every((option) => available.has(option)))) return null;
  const alternatives = (credentialOptions ?? []).filter((alternative) => alternative.length > 0 && alternative.every((option) => option.startsWith("credentials."))).map((alternative) => alternative.map((option) => option.slice("credentials.".length)));
  return { alternatives, missing: alternatives.map((alternative) => alternative.filter((name) => !available.has("credentials." + name))) };
}

/** Bound file/stdin reads before allocating a full credential document. */
export function readNamedCredentialsFile(input: string, schemes: CredentialSchemes): NamedCredentials {
  let fd: number | undefined;
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    fd = input === "-" ? 0 : openSync(input.slice(1), "r");
    while (true) {
      const buffer = Buffer.alloc(Math.min(32_768, 1_048_577 - total));
      const size = readSync(fd, buffer, 0, buffer.length, null);
      if (!size) break;
      total += size;
      if (total > 1_048_576) throw new Error("size");
      chunks.push(buffer.subarray(0, size));
    }
  } catch {
    throw new Error("Cannot read named credentials. Supply a readable JSON file or stdin input of at most 1 MiB.");
  } finally { if (fd !== undefined && input !== "-") closeSync(fd); }
  return parseNamedCredentials(Buffer.concat(chunks).toString("utf8"), schemes);
}

const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const TRANSPORT_HEADERS = new Set(["host", "content-length", "content-type", "transfer-encoding", "connection"]);

/** Extra request headers from repeated `--header "Name: value"` flags and a
 * `<PREFIX>_HEADERS` variable (a JSON object, or one `Name: value` per line).
 * The escape hatch for credentials a spec does not declare. Flags win over
 * the environment; values never appear in errors. */
export function parseExtraHeaders(environment: string | undefined, flags: readonly string[], variable: string): Record<string, string> {
  const entries: [string, string][] = [];
  const line = (text: string, source: string) => {
    const colon = text.indexOf(":");
    if (colon <= 0) throw new Error(source + " expects \"Name: value\".");
    entries.push([text.slice(0, colon).trim(), text.slice(colon + 1).trim()]);
  };
  if (environment !== undefined && environment.trim()) {
    const text = environment.trim();
    if (text.startsWith("{")) {
      let value: unknown;
      try { value = JSON.parse(text); } catch { throw new Error(variable + " must be a JSON object of header names to values, or one \"Name: value\" per line."); }
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.values(value).some((entry) => typeof entry !== "string")) throw new Error(variable + " must map header names to string values.");
      entries.push(...Object.entries(value as Record<string, string>));
    } else for (const part of text.split(/\r?\n/)) if (part.trim()) line(part, variable);
  }
  for (const flag of flags) line(flag, "--header");
  const headers: Record<string, string> = {};
  for (const [name, value] of entries) {
    if (!HEADER_NAME.test(name)) throw new Error("Header names may contain only token characters. Check --header and " + variable + ".");
    if (TRANSPORT_HEADERS.has(name.toLowerCase())) throw new Error("The " + name + " header is set by the client and cannot be overridden.");
    if (/[\r\n\0]/.test(value)) throw new Error("Header values cannot contain line breaks. Check --header and " + variable + ".");
    for (const existing of Object.keys(headers)) if (existing.toLowerCase() === name.toLowerCase()) delete headers[existing];
    headers[name] = value;
  }
  return headers;
}

/** Apply extra headers last, replacing any header of the same name. */
export function applyExtraHeaders(target: Record<string, string>, extra: Record<string, string>): void {
  for (const [name, value] of Object.entries(extra)) {
    for (const existing of Object.keys(target)) if (existing.toLowerCase() === name.toLowerCase()) delete target[existing];
    target[name] = value;
  }
}
