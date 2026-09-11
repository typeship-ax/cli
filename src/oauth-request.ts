
export class OAuthResponseError extends Error {
  readonly code: "request_failed" | "timed_out" | "cancelled" | "response_too_large" | "invalid_response";
  constructor(code: OAuthResponseError["code"]) {
    const messages = {
      request_failed: "OAuth request failed. Check the configured provider endpoint.",
      timed_out: "OAuth request timed out. Run login again to retry.",
      cancelled: "OAuth request was cancelled.",
      response_too_large: "OAuth provider response exceeded 1 MiB.",
      invalid_response: "OAuth provider returned an invalid JSON response.",
    };
    super(messages[code]);
    this.code = code;
    this.name = "OAuthResponseError";
  }
}

export type DeviceOAuthError = "authorization_pending" | "slow_down" | "access_denied" | "expired_token";
interface AuthenticationResponse { status: number; data?: Record<string, unknown>; error?: DeviceOAuthError }

/** Error bodies and transport causes may contain credentials and are discarded. */
export function oauthJsonRequest(url: string | URL, init: RequestInit = {}, timeoutMs = 30_000): Promise<AuthenticationResponse> {
  return boundedRequest(url, init, timeoutMs, "json");
}
/** Device polling needs four protocol errors. Return only their exact names,
 * never descriptions, error URIs, arbitrary error codes or other body fields. */
export function oauthDeviceRequest(url: string | URL, init: RequestInit = {}, timeoutMs = 30_000): Promise<AuthenticationResponse> {
  return boundedRequest(url, init, timeoutMs, "device");
}
/** Revocation may return an empty success body. Do not wait for or parse it. */
export function oauthStatusRequest(url: string | URL, init: RequestInit = {}, timeoutMs = 30_000): Promise<{ status: number }> {
  return boundedRequest(url, init, timeoutMs, "status");
}

/** Bound the entire exchange, including decoded response bytes. */
async function boundedRequest(url: string | URL, init: RequestInit, timeoutMs: number, mode: "json" | "device" | "status"): Promise<AuthenticationResponse> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) throw new OAuthResponseError("request_failed");
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let interrupted: "timed_out" | "cancelled" | undefined;
  let rejectDeadline!: (reason: Error) => void;
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const stop = (code: "timed_out" | "cancelled") => { interrupted ??= code; rejectDeadline(new OAuthResponseError(interrupted)); controller.abort(); };
  const cancel = () => stop("cancelled");
  init.signal?.addEventListener("abort", cancel, { once: true });
  timer = setTimeout(() => stop("timed_out"), timeoutMs);
  try {
    if (init.signal?.aborted) throw new OAuthResponseError("cancelled");
    const request: RequestInit & { cache: "no-store" } = { ...init, redirect: "error", credentials: "omit", cache: "no-store", signal: controller.signal };
    const response = await Promise.race([
      fetch(url, request).then((value) => {
        // Also dispose a late response from a transport that ignored abort.
        if (controller.signal.aborted) void value.body?.cancel().catch(() => {});
        return value;
      }), deadline,
    ]);
    if (response.redirected) { void response.body?.cancel().catch(() => {}); throw new OAuthResponseError("request_failed"); }
    if (mode === "status" || response.status !== 200 && !(mode === "device" && response.status === 400)) { void response.body?.cancel().catch(() => {}); return { status: response.status }; }
    if (!response.body) throw new OAuthResponseError("invalid_response");
    reader = response.body.getReader();
    let size = 0, text = "";
    const decoder = new TextDecoder("utf-8", { fatal: true });
    while (true) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1_048_576) throw new OAuthResponseError("response_too_large");
      try { text += decoder.decode(chunk.value, { stream: true }); }
      catch { throw new OAuthResponseError("invalid_response"); }
    }
    try { text += decoder.decode(); }
    catch { throw new OAuthResponseError("invalid_response"); }
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new OAuthResponseError("invalid_response"); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new OAuthResponseError("invalid_response");
    if (response.status !== 200) {
      const error = (data as Record<string, unknown>).error;
      return { status: response.status, ...(["authorization_pending", "slow_down", "access_denied", "expired_token"].includes(String(error)) && typeof error === "string" ? { error: error as DeviceOAuthError } : {}) };
    }
    return { status: response.status, data: data as Record<string, unknown> };
  } catch (error) {
    if (interrupted) throw new OAuthResponseError(interrupted);
    if (error instanceof OAuthResponseError) throw error;
    throw new OAuthResponseError("request_failed");
  } finally {
    clearTimeout(timer); init.signal?.removeEventListener("abort", cancel); controller.abort();
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
