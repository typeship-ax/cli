import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { oauthJsonRequest, OAuthResponseError } from "./oauth-request.js";

export interface OAuthLoginConfig {
  issuer: string;
  clientId: string;
  discoveryUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  /** Register http://127.0.0.1/callback; an omitted port uses a random port. */
  redirectUri?: string;
  scopes?: string[];
  audience?: string;
  resource?: string;
  /** Explicit runtime selection. The CLI verifies this ID through the API. */
  organization?: { parameter: "organization" | "organization_id"; id: string };
}

export interface OAuthLoginSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  issuer: string;
  clientId: string;
  tokenUrl: string;
  /** The actual native callback used for this exchange, including its port. */
  redirectUri: string;
  revocationUrl?: string;
  scopes?: string[];
}

export interface OAuthLoginInteraction {
  /** Open or display the URL. Never send the verifier or returned tokens. */
  authorize(url: string): void | Promise<void>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function endpoint(value: string): URL {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.hash) {
    throw new Error("OAuth endpoints require HTTPS without credentials or fragments; loopback HTTP is allowed for development.");
  }
  return url;
}

async function metadata(config: OAuthLoginConfig, signal: AbortSignal) {
  const issuer = endpoint(config.issuer);
  if (issuer.search) throw new Error("The OAuth issuer must not contain a query.");
  const path = issuer.pathname.replace(/\/$/, "");
  const urls = config.discoveryUrl ? [config.discoveryUrl] : [
    issuer.origin + "/.well-known/oauth-authorization-server" + path,
    issuer.origin + path + "/.well-known/openid-configuration",
  ];
  for (const url of urls) {
    let response: Awaited<ReturnType<typeof oauthJsonRequest>>;
    try { response = await oauthJsonRequest(endpoint(url), { headers: { Accept: "application/json" }, signal }, 10_000); }
    catch (error) {
      if (!signal.aborted && error instanceof OAuthResponseError && error.code === "request_failed") continue;
      throw error;
    }
    if (response.status !== 200) continue;
    const data = response.data!;
    if (data.issuer !== config.issuer) throw new Error("OAuth discovery returned a different issuer. Check the issuer and discovery URL.");
    if (Array.isArray(data.code_challenge_methods_supported) && !data.code_challenge_methods_supported.includes("S256")) {
      throw new Error("The provider does not advertise S256 PKCE support.");
    }
    const authorizationUrl = config.authorizationUrl ?? data.authorization_endpoint;
    const tokenUrl = config.tokenUrl ?? data.token_endpoint;
    if (typeof authorizationUrl !== "string" || typeof tokenUrl !== "string") throw new Error("Browser login requires authorization and token endpoints.");
    return {
      authorizationUrl: endpoint(authorizationUrl), tokenUrl: endpoint(tokenUrl).href,
      ...(typeof data.revocation_endpoint === "string" ? { revocationUrl: endpoint(data.revocation_endpoint).href } : {}),
    };
  }
  // Some custom providers publish no metadata. Their explicit endpoints are
  // owner configuration, not endpoints accepted from an unverified document.
  if (config.authorizationUrl && config.tokenUrl) return {
    authorizationUrl: endpoint(config.authorizationUrl), tokenUrl: endpoint(config.tokenUrl).href,
  };
  throw new Error("Could not discover OAuth endpoints. Check the issuer or provide explicit authorization and token URLs.");
}

/** Authorization Code + S256 PKCE for a public native client. The listener
 * binds only a loopback IP, verifies state/issuer, and closes on every path. */
export async function oauthBrowserLogin(config: OAuthLoginConfig, interaction: OAuthLoginInteraction): Promise<OAuthLoginSession> {
  if (!config.clientId.trim()) throw new Error("Browser login requires a public client ID.");
  if (config.organization && (!["organization", "organization_id"].includes(config.organization.parameter) || typeof config.organization.id !== "string" || !config.organization.id || config.organization.id.length > 512 || /\s|[\u0000-\u001F\u007F]/.test(config.organization.id))) throw new Error("Organization selection requires a supported parameter and a nonempty organization ID without whitespace.");
  const signal = AbortSignal.any([interaction.signal ?? new AbortController().signal, AbortSignal.timeout(interaction.timeoutMs ?? 600_000)]);
  signal.throwIfAborted();
  const endpoints = await metadata(config, signal);
  const redirect = new URL(config.redirectUri ?? "http://127.0.0.1/callback");
  if (redirect.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(redirect.hostname) || redirect.username || redirect.password || redirect.search || redirect.hash) {
    throw new Error("The OAuth redirect must be an HTTP loopback IP URL without credentials, query, or fragment.");
  }
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  let resolveCode!: (code: string) => void;
  let rejectCode!: (error: Error) => void;
  const codeResult = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  // Observe rejection even if opening the browser or starting the server fails.
  void codeResult.catch(() => undefined);
  let accepted = false;
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "default-src 'none'");
    let incoming: URL;
    try { incoming = new URL(request.url ?? "/", redirect.origin); } catch { response.writeHead(400).end("Invalid callback URL."); return; }
    if (accepted || request.method !== "GET" || request.headers.host !== redirect.host || incoming.pathname !== redirect.pathname) {
      response.writeHead(404).end("Not found."); return;
    }
    const returnedState = Buffer.from(incoming.searchParams.get("state") ?? "");
    const expectedState = Buffer.from(state);
    if (incoming.searchParams.getAll("state").length !== 1 || returnedState.length !== expectedState.length || !timingSafeEqual(returnedState, expectedState)) {
      response.writeHead(400).end("Invalid login state. Return to the terminal and try again."); return;
    }
    const returnedIssuer = incoming.searchParams.get("iss");
    if (returnedIssuer !== null && (incoming.searchParams.getAll("iss").length !== 1 || returnedIssuer !== config.issuer)) {
      response.writeHead(400).end("The login issuer did not match."); return;
    }
    accepted = true;
    if (incoming.searchParams.has("error")) {
      response.writeHead(400).end("Login was not approved. Return to the terminal.", () => rejectCode(new Error("OAuth authorization was denied or cancelled. Run login again to retry.")));
      return;
    }
    const code = incoming.searchParams.get("code");
    if (!code || incoming.searchParams.getAll("code").length !== 1) {
      response.writeHead(400).end("The provider returned no authorization code.", () => rejectCode(new Error("OAuth callback did not contain one authorization code.")));
      return;
    }
    response.end("Authorization received. Return to the terminal to finish signing in.", () => resolveCode(code));
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 10_000;
  const aborted = () => rejectCode(new Error("Browser login timed out or was cancelled. Run login again to retry."));
  signal.addEventListener("abort", aborted, { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(Number(redirect.port) || 0, redirect.hostname === "[::1]" ? "::1" : "127.0.0.1", () => { server.off("error", reject); resolve(); });
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Could not start the OAuth callback listener.");
    redirect.port = String(address.port);
    signal.throwIfAborted();
    const authorization = new URL(endpoints.authorizationUrl);
    if (config.organization) {
      const other = config.organization.parameter === "organization" ? "organization_id" : "organization";
      if (authorization.searchParams.has(other)) throw new Error("The authorization URL contains a conflicting organization parameter. Update the provider configuration.");
      authorization.searchParams.set(config.organization.parameter, config.organization.id);
    }
    for (const [key, value] of Object.entries({ response_type: "code", client_id: config.clientId, redirect_uri: redirect.href, state, code_challenge: challenge, code_challenge_method: "S256", ...(config.scopes?.length ? { scope: config.scopes.join(" ") } : {}), ...(config.audience ? { audience: config.audience } : {}), ...(config.resource ? { resource: config.resource } : {}) })) authorization.searchParams.set(key, value);
    await interaction.authorize(authorization.href);
    const code = await codeResult;
    signal.throwIfAborted();
    const response = await oauthJsonRequest(endpoints.tokenUrl, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, redirect: "error",
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: config.clientId, redirect_uri: redirect.href, code, code_verifier: verifier, ...(config.audience ? { audience: config.audience } : {}), ...(config.resource ? { resource: config.resource } : {}) }),
      signal,
    });
    const data = response.data;
    if (response.status !== 200 || !data || typeof data.access_token !== "string" || !data.access_token || typeof data.token_type !== "string" || data.token_type.toLowerCase() !== "bearer") {
      throw new Error(`OAuth token exchange failed (HTTP ${response.status}). Check the public client registration and run login again.`);
    }
    if (data.expires_in !== undefined && (typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0)) throw new Error("OAuth provider returned an invalid token lifetime.");
    return {
      accessToken: data.access_token,
      ...(typeof data.refresh_token === "string" && data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      ...(typeof data.expires_in === "number" ? { expiresAt: Date.now() + data.expires_in * 1000 } : {}),
      issuer: config.issuer, clientId: config.clientId, tokenUrl: endpoints.tokenUrl, redirectUri: redirect.href,
      ...(endpoints.revocationUrl ? { revocationUrl: endpoints.revocationUrl } : {}),
      ...(typeof data.scope === "string" ? { scopes: data.scope.split(/\s+/).filter(Boolean) } : {}),
    };
  } finally {
    signal.removeEventListener("abort", aborted);
    server.closeAllConnections();
    if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
