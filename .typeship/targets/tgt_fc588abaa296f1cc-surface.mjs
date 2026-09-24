// Typeship checks this contract against the combined package.
const expected = {"output":"cli","version":1,"members":[["generate","run"],["generate","downloadPackage"],["projects","list"],["projects","create"],["projects","retrieve"],["projects","delete"],["projects","update"],["projects","retrieveDiagnostics"],["projects","refreshDiagnostics"],["projects","remediateDiagnostics"],["projects","retrieveIntegrationHealth"],["projects","listGenerations"],["projects","generate"],["definitions","retrieve"],["definitions","update"],["targets","list"],["targets","create"],["targets","retrieve"],["targets","delete"],["targets","update"],["targets","listReleases"],["targets","retrieveDraft"],["targets","updateDraft"],["targets","adoptRelease"],["targets","retrieveRelease"],["targets","republishRelease"],["targets","retrieveDraftCustomizations"],["targets","retrieveDraftConflicts"],["targets","resolveDraftConflicts"],["targets","discardDraftCustomizations"],["targets","recoverDraftHistory"],["generations","retrieve"],["generations","retrieveFile"],["definitionRevisions","list"],["definitionRevisions","retrieve"],["definitionRevisions","retrieveContent"],["definitionRevisions","retrieveDocumentContent"],["account","retrieve"],["apiKeys","list"],["apiKeys","revoke"]],"clients":["TypeshipClient"],"goCommands":[],"operations":[{"command":["generate","run"]},{"command":["generate","download-package"]},{"command":["projects","list"]},{"command":["projects","create"]},{"command":["projects","retrieve"]},{"command":["projects","delete"]},{"command":["projects","update"]},{"command":["projects","retrieve-diagnostics"]},{"command":["projects","refresh-diagnostics"]},{"command":["projects","remediate-diagnostics"]},{"command":["projects","retrieve-integration-health"]},{"command":["projects","list-generations"]},{"command":["projects","generate"]},{"command":["definitions","retrieve"]},{"command":["definitions","update"]},{"command":["targets","list"]},{"command":["targets","create"]},{"command":["targets","retrieve"]},{"command":["targets","delete"]},{"command":["targets","update"]},{"command":["targets","list-releases"]},{"command":["targets","retrieve-draft"]},{"command":["targets","update-draft"]},{"command":["targets","adopt-release"]},{"command":["targets","retrieve-release"]},{"command":["targets","republish-release"]},{"command":["targets","retrieve-draft-customizations"]},{"command":["targets","retrieve-draft-conflicts"]},{"command":["targets","resolve-draft-conflicts"]},{"command":["targets","discard-draft-customizations"]},{"command":["targets","recover-draft-history"]},{"command":["generations","retrieve"]},{"command":["generations","retrieve-file"]},{"command":["definition-revisions","list"]},{"command":["definition-revisions","retrieve"]},{"command":["definition-revisions","retrieve-content"]},{"command":["definition-revisions","retrieve-document-content"]},{"command":["account","retrieve"]},{"command":["api-keys","list"]},{"command":["api-keys","revoke"]}],"executableName":"typeship","operationSpecs":[{"resource":"generate","method":"run","command":["generate","run"],"tool":"generate_run","httpMethod":"POST","path":"/generate"},{"resource":"generate","method":"downloadPackage","command":["generate","download-package"],"tool":"generate_download_package","httpMethod":"GET","path":"/generate/download"},{"resource":"projects","method":"list","command":["projects","list"],"tool":"projects_list","httpMethod":"GET","path":"/projects"},{"resource":"projects","method":"create","command":["projects","create"],"tool":"projects_create","httpMethod":"POST","path":"/projects"},{"resource":"projects","method":"retrieve","command":["projects","retrieve"],"tool":"projects_retrieve","httpMethod":"GET","path":"/projects/{project_id}"},{"resource":"projects","method":"delete","command":["projects","delete"],"tool":"projects_delete","httpMethod":"DELETE","path":"/projects/{project_id}"},{"resource":"projects","method":"update","command":["projects","update"],"tool":"projects_update","httpMethod":"PATCH","path":"/projects/{project_id}"},{"resource":"projects","method":"retrieveDiagnostics","command":["projects","retrieve-diagnostics"],"tool":"projects_retrieve_diagnostics","httpMethod":"GET","path":"/projects/{project_id}/diagnostics"},{"resource":"projects","method":"refreshDiagnostics","command":["projects","refresh-diagnostics"],"tool":"projects_refresh_diagnostics","httpMethod":"POST","path":"/projects/{project_id}/diagnostics"},{"resource":"projects","method":"remediateDiagnostics","command":["projects","remediate-diagnostics"],"tool":"projects_remediate_diagnostics","httpMethod":"POST","path":"/projects/{project_id}/diagnostics/remediations"},{"resource":"projects","method":"retrieveIntegrationHealth","command":["projects","retrieve-integration-health"],"tool":"projects_retrieve_integration_health","httpMethod":"GET","path":"/projects/{project_id}/integration-health"},{"resource":"projects","method":"listGenerations","command":["projects","list-generations"],"tool":"projects_list_generations","httpMethod":"GET","path":"/projects/{project_id}/generations"},{"resource":"projects","method":"generate","command":["projects","generate"],"tool":"projects_generate","httpMethod":"POST","path":"/projects/{project_id}/generations"},{"resource":"definitions","method":"retrieve","command":["definitions","retrieve"],"tool":"definitions_retrieve","httpMethod":"GET","path":"/definitions/{definition_id}"},{"resource":"definitions","method":"update","command":["definitions","update"],"tool":"definitions_update","httpMethod":"PATCH","path":"/definitions/{definition_id}"},{"resource":"targets","method":"list","command":["targets","list"],"tool":"targets_list","httpMethod":"GET","path":"/projects/{project_id}/targets"},{"resource":"targets","method":"create","command":["targets","create"],"tool":"targets_create","httpMethod":"POST","path":"/projects/{project_id}/targets"},{"resource":"targets","method":"retrieve","command":["targets","retrieve"],"tool":"targets_retrieve","httpMethod":"GET","path":"/targets/{target_id}"},{"resource":"targets","method":"delete","command":["targets","delete"],"tool":"targets_delete","httpMethod":"DELETE","path":"/targets/{target_id}"},{"resource":"targets","method":"update","command":["targets","update"],"tool":"targets_update","httpMethod":"PATCH","path":"/targets/{target_id}"},{"resource":"targets","method":"listReleases","command":["targets","list-releases"],"tool":"targets_list_releases","httpMethod":"GET","path":"/targets/{target_id}/releases"},{"resource":"targets","method":"retrieveDraft","command":["targets","retrieve-draft"],"tool":"targets_retrieve_draft","httpMethod":"GET","path":"/targets/{target_id}/draft"},{"resource":"targets","method":"updateDraft","command":["targets","update-draft"],"tool":"targets_update_draft","httpMethod":"PATCH","path":"/targets/{target_id}/draft"},{"resource":"targets","method":"adoptRelease","command":["targets","adopt-release"],"tool":"targets_adopt_release","httpMethod":"POST","path":"/targets/{target_id}/adopt"},{"resource":"targets","method":"retrieveRelease","command":["targets","retrieve-release"],"tool":"targets_retrieve_release","httpMethod":"GET","path":"/target-releases/{target_release_id}"},{"resource":"targets","method":"republishRelease","command":["targets","republish-release"],"tool":"targets_republish_release","httpMethod":"POST","path":"/target-releases/{target_release_id}/republish"},{"resource":"targets","method":"retrieveDraftCustomizations","command":["targets","retrieve-draft-customizations"],"tool":"targets_retrieve_draft_customizations","httpMethod":"GET","path":"/targets/{target_id}/draft/customizations"},{"resource":"targets","method":"retrieveDraftConflicts","command":["targets","retrieve-draft-conflicts"],"tool":"targets_retrieve_draft_conflicts","httpMethod":"GET","path":"/targets/{target_id}/draft/conflicts"},{"resource":"targets","method":"resolveDraftConflicts","command":["targets","resolve-draft-conflicts"],"tool":"targets_resolve_draft_conflicts","httpMethod":"POST","path":"/targets/{target_id}/draft/conflicts/resolve"},{"resource":"targets","method":"discardDraftCustomizations","command":["targets","discard-draft-customizations"],"tool":"targets_discard_draft_customizations","httpMethod":"POST","path":"/targets/{target_id}/draft/customizations/discard"},{"resource":"targets","method":"recoverDraftHistory","command":["targets","recover-draft-history"],"tool":"targets_recover_draft_history","httpMethod":"POST","path":"/targets/{target_id}/draft/history/recover"},{"resource":"generations","method":"retrieve","command":["generations","retrieve"],"tool":"generations_retrieve","httpMethod":"GET","path":"/generations/{generation_id}"},{"resource":"generations","method":"retrieveFile","command":["generations","retrieve-file"],"tool":"generations_retrieve_file","httpMethod":"GET","path":"/generations/{generation_id}/file"},{"resource":"definitionRevisions","method":"list","command":["definition-revisions","list"],"tool":"definition_revisions_list","httpMethod":"GET","path":"/definitions/{definition_id}/revisions"},{"resource":"definitionRevisions","method":"retrieve","command":["definition-revisions","retrieve"],"tool":"definition_revisions_retrieve","httpMethod":"GET","path":"/definition-revisions/{definition_revision_id}"},{"resource":"definitionRevisions","method":"retrieveContent","command":["definition-revisions","retrieve-content"],"tool":"definition_revisions_retrieve_content","httpMethod":"GET","path":"/definition-revisions/{definition_revision_id}/content"},{"resource":"definitionRevisions","method":"retrieveDocumentContent","command":["definition-revisions","retrieve-document-content"],"tool":"definition_revisions_retrieve_document_content","httpMethod":"GET","path":"/definition-revisions/{definition_revision_id}/documents/{document_id}/content"},{"resource":"account","method":"retrieve","command":["account","retrieve"],"tool":"account_retrieve","httpMethod":"GET","path":"/me"},{"resource":"apiKeys","method":"list","command":["api-keys","list"],"tool":"api_keys_list","httpMethod":"GET","path":"/api-keys"},{"resource":"apiKeys","method":"revoke","command":["api-keys","revoke"],"tool":"api_keys_revoke","httpMethod":"DELETE","path":"/api-keys/{api_key_id}"}]};

import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stdout + result.stderr);
  if (result.stdout) process.stdout.write(result.stdout);
}
if (["typescript-sdk", "cli", "mcp"].includes(expected.output)) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  let entry = typeof pkg.exports === "string" ? pkg.exports : pkg.exports?.["."];
  entry = typeof entry === "string" ? entry : entry?.import || entry?.require || entry?.default;
  const exports = await import(pathToFileURL(resolve(expected.output === "typescript-sdk" ? entry || pkg.module || pkg.main : "dist/index.js")).href);
  for (const name of expected.clients) {
    assert.equal(typeof exports[name], "function", "Missing public client " + name);
    const client = new exports[name]({ baseUrl: "http://127.0.0.1:1" });
    for (const [resource, method] of expected.members) assert.equal(typeof client[resource]?.[method], "function", "Missing generated method " + resource + "." + method);
  }
} else if (expected.output === "python-sdk") {
  const source = [
    "import importlib",
    "package = importlib.import_module(" + JSON.stringify(expected.moduleName) + ")",
    "for name in " + JSON.stringify(expected.clients) + ":",
    "    client = getattr(package, name)(base_url='http://127.0.0.1:1')",
    "    for resource, method in " + JSON.stringify(expected.members) + ":",
    "        value = getattr(getattr(client, resource), method)",
    "        assert callable(value), 'Missing generated method: ' + resource + '.' + method",
  ].join("\n");
  run("python", ["-c", source]);
} else if (expected.output === "go-sdk" || expected.output === "go-cli") {
  const filename = "typeship_surface_" + randomBytes(8).toString("hex") + "_test.go";
  let source = "package " + expected.goPackage + "\n";
  if (expected.output === "go-sdk") {
    source += 'import "testing"\nfunc TestTypeshipGeneratedSurface(t *testing.T) {\nc, err := New(WithBaseURL("http://127.0.0.1:1")); if err != nil { t.Fatal(err) }; _ = c\n';
    source += expected.members.map(([resource, method]) => 'if c.' + resource + ' == nil { t.Fatal("Missing generated resource ' + resource + '") }; _ = c.' + resource + '.' + method).join("\n") + "\n}\n";
  } else {
    source += 'import ("testing"; "go/ast"; "go/parser"; "go/token"; "strconv")\n';
    source += "func TestTypeshipGeneratedSurface(t *testing.T) {\n";
    source += 'registered := map[string]bool{}; for _, op := range ops { registered[op.Resource + "." + op.Command + ":" + op.ResourceField + "." + op.GoMethod] = true }\n';
    source += 'file, err := parser.ParseFile(token.NewFileSet(), "exec.go", nil, 0); if err != nil { t.Fatal(err) }; dispatched := map[string]bool{}\n';
    source += 'for _, decl := range file.Decls { fn, ok := decl.(*ast.FuncDecl); if !ok || fn.Name.Name != "invoke" { continue }; ast.Inspect(fn.Body, func(n ast.Node) bool { arm, ok := n.(*ast.CaseClause); if !ok || len(arm.Body) == 0 { return true }; for _, item := range arm.List { if text, ok := item.(*ast.BasicLit); ok && text.Kind == token.STRING { key, _ := strconv.Unquote(text.Value); dispatched[key] = true } }; return true }) }\n';
    for (const op of expected.goCommands) {
      const registration = op.resource + "." + op.command + ":" + op.field + "." + op.method;
      const dispatch = op.field + "." + op.method;
      source += "if !registered[" + JSON.stringify(registration) + "] || !dispatched[" + JSON.stringify(dispatch) + "] { t.Error(" + JSON.stringify("Missing generated command " + op.resource + " " + op.command) + ") }\n";
    }
    source += "}\n";
  }
  writeFileSync(filename, source, { flag: "wx" });
  try { run("go", ["test", "-run", "^TestTypeshipGeneratedSurface$", "."]); }
  finally { rmSync(filename); }
}
if (expected.output === "cli" || expected.output === "mcp") {
  const { OPS } = await import(pathToFileURL(resolve("dist/ops.js")).href);
  assert.ok(Array.isArray(OPS), "Missing generated operation registry");
  const key = (op) => expected.output === "cli" ? JSON.stringify(op.command) : op.tool;
  const actual = new Map(), incoming = new Map(expected.operationSpecs.map((op) => [key(op), op]));
  for (const op of OPS) if (!actual.has(key(op))) actual.set(key(op), op);
  for (const item of expected.operations) {
    const found = actual.get(key(item));
    assert.ok(found, "Missing generated " + (item.tool || item.command.join(" ")));
    const original = incoming.get(key(item));
    for (const key of ["resource", "method", "httpMethod", "path"]) assert.equal(found[key], original[key], "Changed generated operation " + key);
  }
  if (expected.output === "cli") {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const binary = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[expected.executableName];
    assert.equal(typeof binary, "string", "Missing CLI executable");
    // Load the public command table once, regardless of operation count.
    const result = spawnSync(process.execPath, [resolve(binary), "help", "--json"], { encoding: "utf8", timeout: 15000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, "Missing public command discovery: " + result.stderr);
    const help = JSON.parse(result.stdout);
    const commands = new Map((help.resources || []).flatMap((resource) => (resource.commands || []).map((command) => [JSON.stringify([resource.resource, command.command]), command])));
    for (const item of expected.operationSpecs) {
      const found = commands.get(JSON.stringify(item.command));
      assert.ok(found, "Missing generated public command " + item.command.join(" "));
      assert.equal(found.method, item.httpMethod, "Changed public command method");
      assert.equal(found.path, item.path, "Changed public command path");
    }
  }
}
if (expected.output === "mcp") {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const binaries = typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin || {});
  const entry = binaries.find((file) => /mcp\.[cm]?js$/.test(file));
  assert.ok(entry, "Missing public MCP executable");
  const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}, "io.modelcontextprotocol/clientInfo": { name: "typeship-coverage", version: "1" } };
  const requests = [{ jsonrpc: "2.0", id: 0, method: "tools/list", params: { _meta: meta } }, ...expected.operations.map((item, index) => ({ jsonrpc: "2.0", id: index + 1, method: "tools/call", params: { name: "read_docs", arguments: { page: item.tool }, _meta: meta } }))];
  const responses = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [resolvePath(entry)], { stdio: ["pipe", "pipe", "pipe"] });
    const timer = setTimeout(() => { child.kill(); reject(new Error("MCP coverage timed out")); }, 30000);
    let buffer = "", stderr = "";
    const messages = new Map();
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try { const message = JSON.parse(line); messages.set(message.id, message); }
        catch { clearTimeout(timer); child.kill(); reject(new Error("Invalid MCP response")); return; }
        if (messages.size === requests.length) { clearTimeout(timer); child.kill(); resolve(messages); }
      }
    });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("exit", () => { clearTimeout(timer); reject(new Error("MCP exited before coverage completed: " + stderr)); });
    for (const request of requests) child.stdin.write(JSON.stringify(request) + "\n");
  });
  const tools = responses.get(0)?.result?.tools;
  assert.ok(Array.isArray(tools), "Missing public tool list");
  for (let index = 0; index < expected.operations.length; index++) {
    const item = expected.operations[index];
    assert.ok(tools.some((tool) => tool.name === (expected.toolMode === "meta" ? "execute" : item.tool)), "Missing public tool " + item.tool);
    const result = responses.get(index + 1)?.result;
    assert.equal(result?.isError, false, "Missing generated tool " + item.tool);
  }
}
function resolvePath(path) { return resolve(path); }
console.log("Generated operation coverage passed.");
