import { openSync, readSync, closeSync, fstatSync, constants } from "node:fs";
import { oauthJsonRequest } from "./oauth-request.js";
import { sameConsoleLoginConfiguration, matchesConsoleBrowserEvidence, type ConsoleLoginCheck, type ConsoleLoginConfiguration } from "./console-login-contract.js";
import { type OAuthLoginSession } from "./oauth-login.js";
import { parseNamedCredentials, type CredentialSchemes, type NamedCredentials } from "./named-credentials.js";

function readCheck(path: string): ConsoleLoginCheck {
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
    if (!fstatSync(fd).isFile()) throw new Error();
    const buffer = Buffer.alloc(65_537);
    let size = 0;
    while (size < buffer.length) { const n = readSync(fd, buffer, size, buffer.length - size, null); if (!n) break; size += n; }
    if (size > 65_536) throw new Error();
    const value = JSON.parse(buffer.subarray(0, size).toString("utf8")) as ConsoleLoginCheck;
    if (value.version !== 1 || typeof value.ticket !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.ticket) || !value.configuration || !Array.isArray(value.expectations) || !value.expectations.length || value.expectations.length > 3) throw new Error();
    const endpoint = new URL(value.endpoint);
    const development = endpoint.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(endpoint.hostname);
    if (!(endpoint.origin === "https://typeship.dev" || development) || endpoint.pathname !== "/api/authentication/browser" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error();
    const remaining = Date.parse(value.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 600_000) throw new Error();
    return value;
  } catch { throw new Error("Download a new login check from your Typeship Console and pass its JSON file to --console-check. Checks expire after ten minutes."); }
  finally { if (fd !== undefined) closeSync(fd); }
}

/** No traffic to Typeship occurs without the explicit --console-check action.
 * Only the credentials selected for the identity read leave this process;
 * refresh tokens and other stored logins are never sent to the Console. */
export async function checkConsoleBrowserLogin(input: {
  file: string;
  configuration: ConsoleLoginConfiguration;
  schemes: CredentialSchemes;
  credentials: NamedCredentials;
  login(timeoutMs: number): Promise<OAuthLoginSession>;
  verify(credentials: NamedCredentials, expectations: ConsoleLoginCheck["expectations"]): Promise<void>;
  progress(message: string): void;
}): Promise<{ ok: true; method: "oauth_browser"; console_verified: true; revoked: boolean | null }> {
  const check = readCheck(input.file);
  if (!sameConsoleLoginConfiguration(input.configuration, check.configuration)) throw new Error("This CLI's authentication settings do not match the saved Target. Regenerate the CLI, select the matching environment, and download a new check.");
  const send = async (body: Record<string, unknown>, timeoutMs = 30_000) => {
    const response = await oauthJsonRequest(check.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ticket: check.ticket, ...body }) }, timeoutMs);
    if (response.status === 422) throw new Error("Typeship could not verify this login. Check the expected identity, API permissions and saved Target settings, then download a new check.");
    if (response.status !== 200 || response.data?.ok !== true) throw new Error("The Console check expired, was already used, changed, or could not be completed. Download a new check and try again.");
    return response.data;
  };
  await send({ action: "inspect" });
  let revoked: boolean | null = null;
  try {
    const supplied = parseNamedCredentials(input.credentials, input.schemes);
    // Only a complete alternative that uses the fresh browser token proves
    // browser access. An unrelated key-only alternative is not sufficient.
    const requirement = input.configuration.requirements.find((entry) => {
      const names = Object.keys(entry);
      if (!names.some((name) => input.schemes[name]?.kind === "bearer") || !names.every((name) => input.schemes[name]?.kind === "bearer" || supplied[name] !== undefined)) return false;
      const selected = input.configuration.requirements.find((candidate) => Object.keys(candidate).every((name) => names.includes(name)));
      return selected && Object.keys(selected).some((name) => input.schemes[name]?.kind === "bearer");
    });
    if (!requirement) throw new Error("Supply the additional named credentials required by the identity read with --credentials @file or environment variables.");
    input.progress("This check runs a temporary browser login. Typeship will receive only the access token and any additional credentials required for the identity read; refresh tokens stay on this computer.");
    const session = await input.login(Math.max(1, Date.parse(check.expiresAt) - Date.now()));
    try {
      const evidence = { method: "oauth_browser" as const, issuer: session.issuer, clientId: session.clientId, redirectUri: session.redirectUri };
      if (!matchesConsoleBrowserEvidence(input.configuration, evidence)) throw new Error("The browser login did not use the Target's client registration and native callback.");
      const credentials: NamedCredentials = Object.fromEntries(Object.keys(requirement).map((name) => [name, input.schemes[name]!.kind === "bearer" ? session.accessToken : supplied[name]! ]));
      await input.verify(credentials, check.expectations);
      await send({ action: "complete", configuration: input.configuration, evidence, credentials, expectations: check.expectations });
    } finally {
      // Verification sessions never replace the customer's saved login.
      // Revoke the temporary grant when the provider advertises an endpoint.
      if (session.revocationUrl) {
        try {
          const response = await fetch(session.revocationUrl, { method: "POST", redirect: "error", credentials: "omit", signal: AbortSignal.timeout(10_000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: session.refreshToken ?? session.accessToken, token_type_hint: session.refreshToken ? "refresh_token" : "access_token", client_id: session.clientId }) });
          void response.body?.cancel().catch(() => {});
          revoked = response.status === 200;
        } catch { revoked = false; }
      }
    }
  } catch (error) {
    // Report only that the attempt ended. Never send provider errors, identity
    // values or credentials, and never replace the original local error. A
    // consumed check rejects this report, preserving any completed API proof.
    try { await send({ action: "fail" }, 5_000); } catch { /* Best effort; the Console can still expire the check. */ }
    throw error;
  }
  return { ok: true, method: "oauth_browser", console_verified: true, revoked };
}
