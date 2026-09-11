import { randomBytes } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FileCredentialStore } from "./oauth-session.js";

export interface ProfileConfig { baseUrl?: string; environment?: string; docsUrl?: string }
export interface ProfileContext { name: string; directory: string; source: "flag" | "environment" | "selected" | "default" }

export function profileName(value: string): string {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(value)) throw new Error("Profile names use 1–64 lowercase letters, numbers, hyphens or underscores and cannot be reserved OS names.");
  return value;
}

function json(path: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error("Cannot read profile settings. Repair the settings file before retrying.");
  }
}
function write(directory: string, file: string, value: unknown): void {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, ".profile-" + randomBytes(16).toString("hex") + ".tmp");
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600, flush: true });
    renameSync(temporary, join(directory, file));
  } finally { rmSync(temporary, { force: true }); }
}

export function profileDirectory(root: string, name: string): string {
  const directory = join(root, "profiles", profileName(name));
  try {
    const entry = lstatSync(directory);
    if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error("A profile must be a directory, not a link or another file.");
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return directory;
}

export function resolveProfile(root: string, options: { flag?: string; environment?: string; allowMissing?: boolean } = {}): ProfileContext {
  let name: string, source: ProfileContext["source"];
  if (options.flag !== undefined) { name = profileName(options.flag); source = "flag"; }
  else if (options.environment !== undefined) { name = profileName(options.environment); source = "environment"; }
  else {
    const settings = json(join(root, "profiles.json"));
    if (settings && typeof settings.selected !== "string") throw new Error("The selected profile setting is invalid. Pass --profile default to recover.");
    name = settings ? profileName(settings.selected as string) : "default";
    source = settings ? "selected" : "default";
  }
  const directory = profileDirectory(root, name);
  if (name !== "default" && !options.allowMissing && !existsSync(directory)) throw new Error("Profile '" + name + "' does not exist. Run login --profile " + name + " or configure that profile first.");
  return { name, directory, source };
}

export function selectProfile(root: string, name: string): void {
  const directory = profileDirectory(root, name);
  if (name !== "default" && !existsSync(directory)) throw new Error("Profile '" + name + "' does not exist. Log in or configure it before selecting it.");
  write(root, "profiles.json", { selected: name });
}

export function readProfileConfig(directory: string): ProfileConfig {
  const value = json(join(directory, "config.json")) ?? {};
  for (const [key, field] of Object.entries(value)) if (!["baseUrl", "environment", "docsUrl"].includes(key) || typeof field !== "string") throw new Error("Profile settings contain an unknown field or a non-string value.");
  return value as ProfileConfig;
}

export async function updateProfileConfig(directory: string, change: (current: ProfileConfig) => ProfileConfig): Promise<void> {
  await new FileCredentialStore(join(directory, "config.json")).withLock(async () => { write(directory, "config.json", change(readProfileConfig(directory))); });
}

export function listProfiles(root: string): { name: string; config: ProfileConfig; hasSavedCredentials: boolean }[] {
  const names = new Set(["default"]);
  try {
    for (const entry of readdirSync(join(root, "profiles"), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      try { names.add(profileName(entry.name)); } catch { /* unrelated directories are not profiles */ }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return [...names].sort().map((name) => {
    const directory = profileDirectory(root, name);
    return { name, config: readProfileConfig(directory), hasSavedCredentials: ["credentials.enc", "credentials.json"].some((file) => existsSync(join(directory, file))) };
  });
}

/** Removing a profile requires logout first. Hold the settings and both storage
 * locks so a concurrent login cannot be deleted underneath its transaction. */
export async function removeProfile(root: string, name: string): Promise<void> {
  const directory = profileDirectory(root, name);
  if (!existsSync(directory)) throw new Error("Profile '" + name + "' does not exist.");
  const paths = ["config.json", "credentials.enc", "credentials.json"].map((file) => join(directory, file));
  await new FileCredentialStore(paths[0]!).withLock(async () => {
    await new FileCredentialStore(paths[1]!).withLock(async () => {
      await new FileCredentialStore(paths[2]!).withLock(async () => {
        if (paths.slice(1).some((path) => existsSync(path))) throw new Error("Log out of both credential stores for profile '" + name + "' before removing it. Use logout --profile " + name + ".");
        const selected = json(join(root, "profiles.json"));
        if (selected?.selected === name) selectProfile(root, "default");
        rmSync(directory, { recursive: true });
      });
    });
  });
}

export function profileFlag(args: string[]): string | undefined {
  let value: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--profile") {
      value = args[++i];
      if (value === undefined || value.startsWith("--")) throw new Error("--profile requires a profile name.");
    } else if (args[i]!.startsWith("--profile=")) value = args[i]!.slice("--profile=".length);
  }
  return value === undefined ? undefined : profileName(value);
}
