import { createHash, randomBytes } from "node:crypto";
import { closeSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertApiIdentity, type IdentityConfiguration, type VerifiedIdentity } from "./api-identity.js";
import { oauthJsonRequest } from "./oauth-request.js";

export interface StoredOAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenUrl?: string;
  issuer?: string;
  clientId?: string;
  revocationUrl?: string;
  apiBaseUrl?: string;
  configuredClientId?: string | null;
  scopes?: string[];
  /** New login identity, independent of rotating tokens. */
  sessionId: string;
  binding: string;
  /** Persisted before exchange: an interrupted exchange must not replay a rotating token. */
  refreshPending?: boolean;
}

export interface CredentialDestination { apiBaseUrl: string; environment?: string; profile?: string }

export function assertCredentialDestination(credentials: StoredCredentials, destination: CredentialDestination): void {
  const saved = credentials.destination;
  if (!saved) throw new Error("Saved credentials have no API and profile binding. Log in again before using them.");
  if (new URL(saved.apiBaseUrl).href !== new URL(destination.apiBaseUrl).href) throw new Error("The API destination changed. Log in again before using saved credentials.");
  if ((saved.environment ?? null) !== (destination.environment ?? null) || (saved.profile ?? null) !== (destination.profile ?? null)) throw new Error("The credential environment or profile changed. Log in again before using saved credentials.");
}

export interface StoredCredentials {
  destination?: CredentialDestination;
  named?: Record<string, string | { username: string; password: string }>;
  scalars?: Record<string, string>;
  basic?: { username: string; password: string };
  oauth?: StoredOAuthSession;
  identity?: VerifiedIdentity & { binding: string };
  minted?: { via: "browser"; key_name: string; org_id?: string; revocationUrl?: string };
}

export interface SessionConfiguration extends CredentialDestination {
  identity?: IdentityConfiguration;
  verifyIdentity?: (accessToken: string) => Promise<VerifiedIdentity>;
  clientId?: string | null;
  issuer?: string | null;
  tokenUrl?: string | null;
  discoveryUrl?: string | null;
  authorizationUrl?: string | null;
  scopes?: string[];
  audience?: string;
  resource?: string;
  organizationParameter?: "organization" | "organization_id";
}

/** Bind minimal identity evidence to this credential set and its configured read. */
export function credentialIdentityBinding(credentials: StoredCredentials, identity: IdentityConfiguration): string {
  return createHash("sha256").update(JSON.stringify({
    destination: credentials.destination, scalars: credentials.scalars, named: credentials.named, basic: credentials.basic,
    oauth: credentials.oauth ? { sessionId: credentials.oauth.sessionId, binding: credentials.oauth.binding } : undefined,
    operation: identity.operation, fields: Object.entries(identity.fields).sort(([a], [b]) => a.localeCompare(b)),
  })).digest("hex");
}

export function assertStoredIdentity(credentials: StoredCredentials, identity?: IdentityConfiguration): void {
  if (!identity) return;
  if (!credentials.identity?.values || credentials.identity.binding !== credentialIdentityBinding(credentials, identity) || Object.keys(identity.fields).some((kind) => !Object.hasOwn(credentials.identity!.values, kind))) {
    throw new Error("The saved login has no matching API identity verification. Sign in again to verify the current account and organization.");
  }
}

/** Bind the login to effective nonsecret settings. Scope ordering is irrelevant. */
export function sessionBinding(config: SessionConfiguration): string {
  const url = (value?: string | null) => value ? new URL(value).href : null;
  return createHash("sha256").update(JSON.stringify({
    apiBaseUrl: url(config.apiBaseUrl), environment: config.environment ?? null, profile: config.profile ?? null,
    clientId: config.clientId ?? null, issuer: config.issuer ?? null,
    tokenUrl: url(config.tokenUrl), discoveryUrl: url(config.discoveryUrl), authorizationUrl: url(config.authorizationUrl),
    scopes: [...new Set(config.scopes ?? [])].sort(), audience: config.audience ?? null, resource: config.resource ?? null,
    organizationParameter: config.organizationParameter ?? null,
    identity: config.identity ? { operation: config.identity.operation, fields: Object.entries(config.identity.fields).sort(([a], [b]) => a.localeCompare(b)) } : null,
  })).digest("hex");
}

interface LockedCredentials {
  read(): StoredCredentials | null;
  write(credentials: StoredCredentials | null): void;
}

export interface CredentialStore {
  read(): StoredCredentials | null;
  withLock<T>(work: (store: LockedCredentials) => Promise<T>): Promise<T>;
}

function code(error: unknown): string | undefined { return (error as NodeJS.ErrnoException)?.code; }
function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (error) { return code(error) !== "ESRCH"; }
}

export class CredentialStorageError extends Error {}

export interface CredentialCodec {
  readonly name: string;
  prepare(): void;
  encode(plaintext: string): string;
  decode(encoded: string): string;
}

/** Private file adapter. All writers (login, refresh and logout) use the same
 * cross-process lock. Credential storage can be replaced independently of OAuth. */
export class FileCredentialStore implements CredentialStore {
  constructor(readonly path: string, private readonly lockTimeoutMs = 40_000, private readonly codec?: CredentialCodec) {}

  get backend(): string { return this.codec?.name ?? "private plaintext file"; }

  /** Check storage access before starting an interactive login. */
  async prepare(): Promise<void> { await this.withLock(async () => { this.codec?.prepare(); }); }

  read(): StoredCredentials | null {
    try {
      const encoded = readFileSync(this.path, "utf8");
      const data: unknown = JSON.parse(this.codec ? this.codec.decode(encoded) : encoded);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
      return data as StoredCredentials;
    } catch (error) {
      if (code(error) === "ENOENT") return null;
      if (error instanceof CredentialStorageError) throw error;
      throw new Error("Cannot read saved credentials. Check the credential store before logging in again.");
    }
  }

  private write(credentials: StoredCredentials | null): void {
    if (credentials === null) { rmSync(this.path, { force: true }); return; }
    const temporary = this.path + "." + randomBytes(16).toString("hex") + ".tmp";
    try {
      const plaintext = JSON.stringify(credentials, null, 2);
      writeFileSync(temporary, (this.codec ? this.codec.encode(plaintext) : plaintext) + "\n", { mode: 0o600, flag: "wx", flush: true });
      renameSync(temporary, this.path);
    } finally { rmSync(temporary, { force: true }); }
  }

  async withLock<T>(work: (store: LockedCredentials) => Promise<T>): Promise<T> {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const lock = this.path + ".lock";
    const owner = { pid: process.pid, nonce: randomBytes(16).toString("hex") };
    const claim = lock + "." + owner.nonce;
    // Hard-link a complete owner record: no empty-file window if the process dies.
    writeFileSync(claim, JSON.stringify(owner), { mode: 0o600, flag: "wx" });
    let acquired = false;
    const deadline = Date.now() + this.lockTimeoutMs;
    try {
      while (!acquired) {
        try { linkSync(claim, lock); acquired = true; }
        catch (error) {
          if (code(error) !== "EEXIST") throw new Error("Cannot lock the credential store.");
          this.recoverDeadOwner(lock);
          if (Date.now() >= deadline) throw new Error("The credential store is busy. Wait for the other login or refresh to finish and retry. If its process stopped, inspect " + lock + ".");
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
      return await work({ read: () => this.read(), write: (value) => this.write(value) });
    } finally {
      if (acquired) rmSync(lock, { force: true });
      rmSync(claim, { force: true });
    }
  }

  private recoverDeadOwner(lock: string): void {
    let previous: { pid?: unknown; nonce?: unknown };
    try { previous = JSON.parse(readFileSync(lock, "utf8")); } catch { return; }
    if (!Number.isSafeInteger(previous?.pid) || (previous.pid as number) <= 0 || typeof previous.nonce !== "string" || !/^[a-f0-9]{32}$/.test(previous.nonce) || alive(previous.pid as number)) return;
    // One reclaimer per dead owner. Keep this empty marker: deleting it lets a
    // delayed contender remove a later owner's lock (the ABA race). A double
    // crash during reclamation fails closed with the bounded busy diagnostic.
    const marker = lock + ".reaped-" + previous.nonce;
    try { closeSync(openSync(marker, "wx", 0o600)); } catch { return; }
    try {
      const current = JSON.parse(readFileSync(lock, "utf8")) as { nonce?: string };
      if (current.nonce === previous.nonce) rmSync(lock);
    } catch { /* another process already completed recovery */ }
  }

  async update(change: (current: StoredCredentials) => StoredCredentials): Promise<void> {
    await this.withLock(async (store) => { store.write(change(store.read() ?? {})); });
  }

  /** Explicit local-only logout can remove an unreadable encrypted session. */
  async clear(): Promise<boolean> {
    return this.withLock(async (store) => { const existed = existsSync(this.path); store.write(null); return existed; });
  }

  /** Remove under the refresh lock, then revoke the latest token outside it. */
  async take(): Promise<StoredCredentials | null> {
    return this.withLock(async (store) => { const current = store.read(); store.write(null); return current; });
  }
}

function validSession(credentials: StoredCredentials | null, config: SessionConfiguration, sessionId: string, allowPending = false): StoredOAuthSession {
  const session = credentials?.oauth;
  if (!session || !session.sessionId || session.sessionId !== sessionId) throw new Error("The saved OAuth session changed or was logged out. Run login again and retry the request.");
  if (session.apiBaseUrl && new URL(session.apiBaseUrl).href !== new URL(config.apiBaseUrl).href) throw new Error("The API destination changed. Log in again.");
  if (session.issuer && config.issuer && session.issuer !== config.issuer) throw new Error("The configured issuer changed. Log in again.");
  if (session.configuredClientId !== (config.clientId ?? null)) throw new Error("The OAuth client changed. Log in again.");
  if (!session.binding || session.binding !== sessionBinding(config)) throw new Error("The API or OAuth configuration changed. Log in again before using saved credentials.");
  if (session.refreshPending && !allowPending) throw new Error("The previous OAuth refresh did not finish safely. Log in again; its refresh token will not be reused.");
  if (typeof session.accessToken !== "string" || !session.accessToken) throw new Error("The saved OAuth session is invalid. Log in again.");
  assertStoredIdentity(credentials!, config.identity);
  return session;
}

/** Re-read on every request attempt; only one process may rotate the token.
 * A failed or interrupted exchange requires login, since the server may have
 * consumed its refresh token even when no response reached this process. */
export async function oauthSessionToken(store: CredentialStore, config: SessionConfiguration, sessionId: string, tokenParams: Record<string, string> = {}): Promise<string> {
  const fresh = (session: StoredOAuthSession) => session.expiresAt === undefined || (Number.isFinite(session.expiresAt) && session.expiresAt > Date.now() + 60_000);
  const first = validSession(store.read(), config, sessionId, true);
  if (!first.refreshPending && fresh(first)) return first.accessToken;
  return store.withLock(async (locked) => {
    const credentials = locked.read();
    const session = validSession(credentials, config, sessionId);
    if (fresh(session)) return session.accessToken;
    if (!session.refreshToken || !session.tokenUrl || !session.clientId) throw new Error("The OAuth session expired and cannot be refreshed. Log in again.");
    const endpoint = new URL(session.tokenUrl);
    if ((endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname))) || endpoint.username || endpoint.password || endpoint.hash) throw new Error("The OAuth token endpoint requires HTTPS; loopback HTTP is allowed for development.");
    locked.write({ ...credentials, oauth: { ...session, refreshPending: true } });
    try {
      const response = await oauthJsonRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ ...tokenParams, grant_type: "refresh_token", refresh_token: session.refreshToken, client_id: session.clientId }),
      });
      const body = response.data;
      if (response.status !== 200 || !body || typeof body.access_token !== "string" || !body.access_token || typeof body.token_type !== "string" || body.token_type.toLowerCase() !== "bearer") throw new Error();
      if (body.expires_in !== undefined && (typeof body.expires_in !== "number" || !Number.isFinite(body.expires_in) || body.expires_in <= 0)) throw new Error();
      if (body.refresh_token !== undefined && (typeof body.refresh_token !== "string" || !body.refresh_token)) throw new Error();
      if (body.scope !== undefined && typeof body.scope !== "string") throw new Error();
      const next: StoredOAuthSession = {
        ...session, accessToken: body.access_token, refreshToken: body.refresh_token as string | undefined ?? session.refreshToken,
        expiresAt: typeof body.expires_in === "number" ? Date.now() + body.expires_in * 1000 : undefined,
        ...(typeof body.scope === "string" ? { scopes: body.scope.split(/\s+/).filter(Boolean) } : {}), refreshPending: undefined,
      };
      let identity = credentials?.identity;
      if (config.identity) {
        if (!config.verifyIdentity || !identity) throw new Error();
        const verified = await config.verifyIdentity(next.accessToken);
        assertApiIdentity(identity.values, verified.values);
        identity = { ...identity, ...verified };
      }
      locked.write({ ...credentials, oauth: next, ...(identity ? { identity } : {}) });
      return next.accessToken;
    } catch {
      // Never expose an error body, a refresh token, or fetch's nested cause.
      throw new Error("The OAuth session could not be refreshed safely. Log in again.");
    }
  });
}
