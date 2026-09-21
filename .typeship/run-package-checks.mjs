// Installed by Typeship. This repository owns subsequent changes.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("Pass a Target check manifest.");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.schema !== 1 || !Array.isArray(manifest.checks) || typeof manifest.directory !== "string") {
  throw new Error("Invalid Typeship Target check manifest.");
}
const cwd = resolve(process.cwd(), manifest.directory || ".");
for (const check of manifest.checks) {
  if (!check || typeof check.name !== "string" || typeof check.command !== "string" || check.command.includes("\0")) {
    throw new Error("Invalid Typeship package check.");
  }
  console.log("::group::" + check.name);
  const result = spawnSync(check.command, { cwd, shell: true, stdio: "inherit", env: process.env });
  console.log("::endgroup::");
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
