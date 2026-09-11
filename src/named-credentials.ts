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
