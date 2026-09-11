import { spawnSync } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FileCredentialStore, CredentialStorageError, type CredentialCodec } from "./oauth-session.js";

export interface NativeCommandResult { status: number | null; stdout: string; stderr: string; error?: unknown }
export type NativeCommand = (executable: string, args: string[], input?: string) => NativeCommandResult;
export interface CredentialKeyStore {
  readonly name: string;
  read(): Buffer | null;
  write(key: Buffer): void;
  /** Used only when explicitly removing this wrapping key, not ordinary logout. */
  remove(): void;
}

const nativeCommand: NativeCommand = (executable, args, input) => {
  const result = spawnSync(executable, args, { input, encoding: "utf8", timeout: 15_000, maxBuffer: 64 * 1024, windowsHide: true, shell: false });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", ...(result.error ? { error: result.error } : {}) };
};

function unavailable(name: string, environmentName: string): never {
  throw new CredentialStorageError("Cannot access " + name + ". Unlock or enable your OS credential store and retry. For a headless session, supply credentials through environment variables. Plaintext storage requires explicitly setting " + environmentName + "=file.");
}
function parseKey(value: string): Buffer {
  const encoded = value.trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new CredentialStorageError("The OS credential key is invalid. Restore access to the original key before using the saved session.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new CredentialStorageError("The OS credential key is invalid.");
  return key;
}

/** A small wrapping key avoids OS item-size limits; session files are encrypted
 * separately so refresh rotation can retain the atomic file/lock transaction. */
export function nativeCredentialKeyStore(path: string, platform: NodeJS.Platform = process.platform, run: NativeCommand = nativeCommand, environmentName = "CREDENTIAL_STORE"): CredentialKeyStore {
  const failed = (name: string): never => unavailable(name, environmentName);
  const identity = createHash("sha256").update(resolve(path)).digest("hex");
  const service = "typeship.credentials." + identity;
  const account = "session-key";
  if (platform === "darwin") {
    const name = "macOS Keychain";
    const lookup = () => run("/usr/bin/security", ["find-generic-password", "-s", service, "-a", account, "-w"]);
    return {
      name,
      read() {
        const result = lookup();
        if (!result.error && result.status === 44) return null; // errSecItemNotFound
        if (result.error || result.status !== 0) return failed(name);
        return parseKey(result.stdout);
      },
      write(key) {
        // security's interactive command stream keeps the key off argv. All
        // tokens below have a fixed safe alphabet; no shell or user text is run.
        const input = "add-generic-password -U -s " + service + " -a " + account + " -w " + key.toString("base64") + "\n";
        const result = run("/usr/bin/security", ["-i"], input);
        if (result.error || result.status !== 0) return failed(name);
        // Verify the write: an interactive tool's process status alone is not
        // sufficient evidence that its command stored the requested item.
        const saved = this.read();
        if (!saved || !timingSafeEqual(saved, key)) return failed(name);
      },
      remove() {
        const result = run("/usr/bin/security", ["delete-generic-password", "-s", service, "-a", account]);
        if (result.error || (result.status !== 0 && result.status !== 44)) failed(name);
      },
    };
  }
  if (platform === "linux") {
    const name = "Linux Secret Service (secret-tool)";
    const attributes = ["service", service, "account", account];
    return {
      name,
      read() {
        const result = run("/usr/bin/secret-tool", ["lookup", ...attributes]);
        if (!result.error && result.status === 1 && !result.stderr.trim()) return null;
        if (result.error || result.status !== 0) return failed(name);
        return parseKey(result.stdout);
      },
      write(key) {
        const result = run("/usr/bin/secret-tool", ["store", "--label=CLI session encryption key", ...attributes], key.toString("base64"));
        if (result.error || result.status !== 0) return failed(name);
        const saved = this.read();
        if (!saved || !timingSafeEqual(saved, key)) return failed(name);
      },
      remove() {
        const result = run("/usr/bin/secret-tool", ["clear", ...attributes]);
        if (result.error || result.status !== 0) failed(name);
      },
    };
  }
  if (platform === "win32") {
    const name = "Windows DPAPI (current user)";
    const keyPath = path + ".key";
    const executable = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const script = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Security
  $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $bytes = [Convert]::FromBase64String([string]$payload.data)
  $entropy = [Text.Encoding]::UTF8.GetBytes([string]$payload.service)
  $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  if ($payload.action -eq 'protect') { $result = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $entropy, $scope) }
  elseif ($payload.action -eq 'unprotect') { $result = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $entropy, $scope) }
  else { exit 1 }
  [Console]::Out.Write([Convert]::ToBase64String($result))
  exit 0
} catch { exit 1 }
`;
    const crypt = (action: "protect" | "unprotect", data: string) => {
      // EncodedCommand contains fixed code only. Sensitive data goes over stdin.
      const result = run(executable, ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], JSON.stringify({ action, data, service }));
      if (result.error || result.status !== 0 || !result.stdout.trim()) return failed(name);
      return result.stdout.trim();
    };
    return {
      name,
      read() {
        let wrapped: string;
        try { wrapped = readFileSync(keyPath, "utf8"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; return failed(name); }
        return parseKey(crypt("unprotect", wrapped));
      },
      write(key) {
        const wrapped = crypt("protect", key.toString("base64"));
        const temporary = keyPath + "." + randomBytes(16).toString("hex") + ".tmp";
        try {
          writeFileSync(temporary, wrapped, { mode: 0o600, flag: "wx", flush: true });
          renameSync(temporary, keyPath);
        } finally { rmSync(temporary, { force: true }); }
        const saved = this.read();
        if (!saved || !timingSafeEqual(saved, key)) return failed(name);
      },
      remove() { rmSync(keyPath, { force: true }); },
    };
  }
  return { name: "OS credential storage", read: () => failed("OS credential storage on this platform"), write: () => failed("OS credential storage on this platform"), remove: () => failed("OS credential storage on this platform") };
}

export function encryptedCredentialCodec(path: string, keyStore: CredentialKeyStore): CredentialCodec {
  const associatedData = Buffer.from("cli-credentials-v1:" + resolve(path));
  const key = (create: boolean) => {
    const saved = keyStore.read();
    if (saved) return saved;
    if (!create || existsSync(path)) throw new CredentialStorageError("The encryption key for this saved session is missing. Restore the original OS credential store, or run logout --local to remove the saved encrypted session before logging in again.");
    const generated = randomBytes(32);
    keyStore.write(generated);
    return generated;
  };
  return {
    name: keyStore.name,
    prepare() { key(true); },
    encode(plaintext) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key(true), nonce);
      cipher.setAAD(associatedData);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return JSON.stringify({ version: 1, algorithm: "aes-256-gcm", nonce: nonce.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") });
    },
    decode(encoded) {
      let envelope: { version?: unknown; algorithm?: unknown; nonce?: unknown; tag?: unknown; ciphertext?: unknown };
      try { envelope = JSON.parse(encoded); } catch { throw new CredentialStorageError("Saved encrypted credentials are damaged. Restore the credential file before logging in again."); }
      if (!envelope || envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm" || typeof envelope.nonce !== "string" || typeof envelope.tag !== "string" || typeof envelope.ciphertext !== "string") throw new CredentialStorageError("Saved encrypted credentials use an invalid format.");
      const secret = key(false);
      try {
        const nonce = Buffer.from(envelope.nonce, "base64"), tag = Buffer.from(envelope.tag, "base64");
        if (nonce.length !== 12 || tag.length !== 16) throw new Error();
        const decipher = createDecipheriv("aes-256-gcm", secret, nonce);
        decipher.setAAD(associatedData); decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8");
      } catch { throw new CredentialStorageError("Saved credentials could not be authenticated. Restore the original credential file and OS key; do not reuse this session."); }
    },
  };
}

/** OS protection is the default. Plaintext storage is an explicit, separate
 * store for environments where the owner accepts that tradeoff. Never migrate
 * or fall back silently when an OS service is unavailable. */
export function createCredentialStore(directory: string, mode: string = "os", environmentName = "CREDENTIAL_STORE"): FileCredentialStore {
  if (mode === "file") return new FileCredentialStore(join(directory, "credentials.json"));
  if (mode !== "os") throw new CredentialStorageError(environmentName + " must be os or file.");
  const path = join(directory, "credentials.enc");
  return new FileCredentialStore(path, 40_000, encryptedCredentialCodec(path, nativeCredentialKeyStore(path, process.platform, nativeCommand, environmentName)));
}
