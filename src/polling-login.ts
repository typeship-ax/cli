import { createHash, randomBytes } from "node:crypto";
import { oauthJsonRequest, oauthDeviceRequest, OAuthResponseError } from "./oauth-request.js";

export class LoginPollingError extends Error {
  constructor(readonly code: "cancelled" | "expired" | "denied" | "invalid_response" | "request_failed") {
    super({ cancelled: "Login was cancelled.", expired: "Login expired. Run login again and approve the new request.", denied: "Login was denied. Run login again if you want to retry.", invalid_response: "The login service returned an invalid response. Check its configuration.", request_failed: "The login request failed. Check the service and start a new login." }[code]);
    this.name = "LoginPollingError";
  }
}

export function loginEndpoint(value: string): URL {
  try {
    if (typeof value !== "string" || /[\x00-\x20\x7f]/.test(value)) throw new Error();
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.hash) throw new Error();
    return url;
  } catch { throw new LoginPollingError("invalid_response"); }
}
function text(value: unknown, limit = 65_536): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit && !/[\x00-\x1f\x7f]/.test(value);
}
function seconds(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.ceil(value * 1000));
}
function interval(value: unknown, fallback: number): number {
  if (value === undefined) return fallback * 1000;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.ceil(value * 1000))) throw new LoginPollingError("invalid_response");
  return Math.max(1, value) * 1000;
}
function lifetime(signal: AbortSignal | undefined, timeoutMs: number, maximum: number) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > maximum) throw new LoginPollingError("invalid_response");
  const controller = new AbortController();
  let expired = false;
  const cancel = () => controller.abort();
  const timer = setTimeout(() => { expired = true; controller.abort(); }, timeoutMs);
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const check = () => { if (controller.signal.aborted) throw new LoginPollingError(expired ? "expired" : "cancelled"); };
  return { signal: controller.signal, check, close() { clearTimeout(timer); signal?.removeEventListener("abort", cancel); } };
}
async function pause(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new LoginPollingError("cancelled");
  await new Promise<void>((resolve, reject) => {
    const done = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); resolve(); };
    const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(new LoginPollingError("cancelled")); };
    const timer = setTimeout(done, Math.min(ms, 2_147_483_647));
    signal.addEventListener("abort", abort, { once: true });
  });
}
const form = (params: Record<string, string>, signal: AbortSignal): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams(params), signal });

export interface DeviceLoginConfig {
  clientId: string; issuer?: string | null; discoveryUrls: string[];
  deviceUrl?: string | null; tokenUrl?: string | null;
  scopes: string[]; audience?: string; resource?: string;
}
export interface DeviceLoginSession {
  accessToken: string; refreshToken?: string; expiresAt?: number;
  tokenUrl: string; issuer?: string; clientId: string; revocationUrl?: string; scopes?: string[];
}

/** RFC 8628: pending and slow_down are the only responses that keep polling.
 * All deadlines include response bodies; cancellation also interrupts waits. */
export async function oauthDeviceLogin(config: DeviceLoginConfig, interaction: {
  authorize(value: { verificationUri: string; userCode: string; expiresIn: number }): void;
  signal?: AbortSignal; timeoutMs?: number;
}): Promise<DeviceLoginSession> {
  const flow = lifetime(interaction.signal, interaction.timeoutMs ?? 900_000, 900_000);
  try {
    flow.check();
    if (!text(config.clientId)) throw new LoginPollingError("invalid_response");
    if (config.issuer && loginEndpoint(config.issuer).search) throw new LoginPollingError("invalid_response");
    let deviceUrl = config.deviceUrl ? loginEndpoint(config.deviceUrl).href : undefined;
    let tokenUrl = config.tokenUrl ? loginEndpoint(config.tokenUrl).href : undefined;
    let revocationUrl: string | undefined;
    for (const url of config.discoveryUrls) {
      if (deviceUrl && tokenUrl) break;
      const response = await oauthJsonRequest(loginEndpoint(url), { headers: { Accept: "application/json" }, signal: flow.signal }, 10_000);
      if (response.status !== 200) continue;
      const data = response.data!;
      if (config.issuer && data.issuer !== config.issuer) throw new LoginPollingError("invalid_response");
      if (!deviceUrl && typeof data.device_authorization_endpoint === "string") deviceUrl = loginEndpoint(data.device_authorization_endpoint).href;
      if (!tokenUrl && typeof data.token_endpoint === "string") tokenUrl = loginEndpoint(data.token_endpoint).href;
      if (data.revocation_endpoint !== undefined) revocationUrl = loginEndpoint(data.revocation_endpoint as string).href;
    }
    if (!deviceUrl || !tokenUrl) throw new LoginPollingError("invalid_response");
    const params = { ...(config.audience ? { audience: config.audience } : {}), ...(config.resource ? { resource: config.resource } : {}) };
    const start = await oauthJsonRequest(deviceUrl, form({ client_id: config.clientId, ...(config.scopes.length ? { scope: config.scopes.join(" ") } : {}), ...params }, flow.signal));
    const data = start.data;
    if (start.status !== 200) throw new LoginPollingError("request_failed");
    if (!data || !text(data.device_code) || !text(data.user_code, 512) || !text(data.verification_uri, 8192) || !seconds(data.expires_in)) throw new LoginPollingError("invalid_response");
    loginEndpoint(data.verification_uri);
    const verificationUri = loginEndpoint((data.verification_uri_complete ?? data.verification_uri) as string).href;
    let intervalMs = interval(data.interval, 5);
    const expiresIn = Math.min(data.expires_in, 900), deadline = Date.now() + expiresIn * 1000;
    interaction.authorize({ verificationUri, userCode: data.user_code, expiresIn });
    while (true) {
      await pause(Math.min(intervalMs, Math.max(0, deadline - Date.now())), flow.signal);
      flow.check();
      if (Date.now() >= deadline) throw new LoginPollingError("expired");
      let response: Awaited<ReturnType<typeof oauthDeviceRequest>>;
      try { response = await oauthDeviceRequest(tokenUrl, form({ ...params, grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: data.device_code, client_id: config.clientId }, flow.signal), Math.min(30_000, deadline - Date.now())); }
      catch (error) {
        flow.check();
        if (error instanceof OAuthResponseError && error.code === "timed_out") { intervalMs *= 2; continue; }
        throw error;
      }
      flow.check();
      if (Date.now() >= deadline) throw new LoginPollingError("expired");
      if (response.status === 400 && response.error === "authorization_pending") continue;
      if (response.status === 400 && response.error === "slow_down") { intervalMs += 5000; continue; }
      if (response.status === 400 && response.error === "access_denied") throw new LoginPollingError("denied");
      if (response.status === 400 && response.error === "expired_token") throw new LoginPollingError("expired");
      if (response.status !== 200) throw new LoginPollingError("request_failed");
      const token = response.data!;
      if (!text(token.access_token) || typeof token.token_type !== "string" || token.token_type.toLowerCase() !== "bearer" || token.error !== undefined || token.refresh_token !== undefined && !text(token.refresh_token) || token.expires_in !== undefined && !seconds(token.expires_in) || token.scope !== undefined && typeof token.scope !== "string") throw new LoginPollingError("invalid_response");
      return { accessToken: token.access_token, ...(typeof token.refresh_token === "string" ? { refreshToken: token.refresh_token } : {}), ...(typeof token.expires_in === "number" ? { expiresAt: Date.now() + token.expires_in * 1000 } : {}), clientId: config.clientId, tokenUrl, ...(config.issuer ? { issuer: config.issuer } : {}), ...(revocationUrl ? { revocationUrl } : {}), ...(typeof token.scope === "string" ? { scopes: token.scope.split(/\s+/).filter(Boolean) } : {}) };
    }
  } catch (error) { flow.check(); throw error; }
  finally { flow.close(); }
}

export interface ApprovedCredential { api_key: string; key_name: string; org_id?: string; revocationUrl: string }

/** This is the owner's custom approval contract, not an OAuth grant. A failed
 * poll is not replayed: its one-use credential may already have been consumed. */
export async function customBrowserApproval(config: { authUrl: string; name: string; source: "agent" | "cli" }, interaction: {
  authorize(value: { verificationUrl: string; expiresIn: number }): void;
  signal?: AbortSignal; timeoutMs?: number;
}): Promise<ApprovedCredential> {
  const flow = lifetime(interaction.signal, interaction.timeoutMs ?? 600_000, 600_000);
  try {
    flow.check();
    const base = loginEndpoint(config.authUrl);
    if (base.search) throw new LoginPollingError("invalid_response");
    const url = base.href.replace(/\/$/, "");
    const verifier = randomBytes(32).toString("base64url"), challenge = createHash("sha256").update(verifier).digest("base64url");
    const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: flow.signal });
    const response = await oauthJsonRequest(url + "/start", post({ code_challenge: challenge, name: config.name, source: config.source }), 15_000);
    if (response.status !== 200) throw new LoginPollingError("request_failed");
    const start = response.data!;
    if (!text(start.session) || !text(start.verification_url, 8192) || start.expires_in !== undefined && !seconds(start.expires_in)) throw new LoginPollingError("invalid_response");
    const verificationUrl = loginEndpoint(start.verification_url).href;
    const expiresIn = Math.min(typeof start.expires_in === "number" ? start.expires_in : 600, 600);
    const intervalMs = interval(start.interval, 3), deadline = Date.now() + expiresIn * 1000;
    interaction.authorize({ verificationUrl, expiresIn });
    while (true) {
      await pause(Math.min(intervalMs, Math.max(0, deadline - Date.now())), flow.signal);
      flow.check();
      if (Date.now() >= deadline) throw new LoginPollingError("expired");
      let result: Awaited<ReturnType<typeof oauthJsonRequest>>;
      try {
        result = await oauthJsonRequest(url + "/status", post({ session: start.session, code_verifier: verifier }), Math.min(15_000, deadline - Date.now()));
      } catch (error) {
        flow.check();
        if (error instanceof OAuthResponseError && error.code === "timed_out" && Date.now() >= deadline) {
          throw new LoginPollingError("expired");
        }
        throw error;
      }
      flow.check();
      if (Date.now() >= deadline) throw new LoginPollingError("expired");
      if (result.status !== 200) throw new LoginPollingError("request_failed");
      const poll = result.data!;
      if (poll.status === "pending") continue;
      if (poll.status === "denied") throw new LoginPollingError("denied");
      if (poll.status === "expired") throw new LoginPollingError("expired");
      if (poll.status !== "complete" || !text(poll.api_key) || poll.key_name !== undefined && !text(poll.key_name, 1024) || poll.org_id !== undefined && !text(poll.org_id, 1024)) throw new LoginPollingError("invalid_response");
      return { api_key: poll.api_key, key_name: typeof poll.key_name === "string" ? poll.key_name : config.name, ...(typeof poll.org_id === "string" ? { org_id: poll.org_id } : {}), revocationUrl: url + "/revoke" };
    }
  } catch (error) { flow.check(); throw error; }
  finally { flow.close(); }
}
