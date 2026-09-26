// Typeship checks this contract against the Draft package.
const expected = {"output":"cli","version":1,"members":[["projects","list"],["projects","create"],["projects","get"],["projects","delete"],["projects","update"],["projects","generate"],["specs","get"],["specs","update"],["specs","refresh"],["specRevisions","list"],["specRevisions","get"],["specRevisions","listFiles"],["targets","list"],["targets","create"],["targets","get"],["targets","delete"],["targets","update"],["targets","adopt"],["deliveries","list"],["deliveries","create"],["deliveries","get"],["deliveries","delete"],["deliveries","update"],["generations","get"],["generations","list"],["generations","listFiles"],["drafts","list"],["drafts","get"],["drafts","update"],["drafts","listFiles"],["drafts","resolve"],["drafts","recover"],["releases","list"],["releases","get"],["releases","retry"],["files","get"],["generate","run"],["generate","downloadPackage"],["organization","get"],["apiKeys","list"],["apiKeys","get"],["apiKeys","revoke"]],"clients":["TypeshipClient"],"goCommands":[],"operations":[{"command":["projects","list"]},{"command":["projects","create"]},{"command":["projects","get"]},{"command":["projects","delete"]},{"command":["projects","update"]},{"command":["projects","generate"]},{"command":["specs","get"]},{"command":["specs","update"]},{"command":["specs","refresh"]},{"command":["spec-revisions","list"]},{"command":["spec-revisions","get"]},{"command":["spec-revisions","list-files"]},{"command":["targets","list"]},{"command":["targets","create"]},{"command":["targets","get"]},{"command":["targets","delete"]},{"command":["targets","update"]},{"command":["targets","adopt"]},{"command":["deliveries","list"]},{"command":["deliveries","create"]},{"command":["deliveries","get"]},{"command":["deliveries","delete"]},{"command":["deliveries","update"]},{"command":["generations","get"]},{"command":["generations","list"]},{"command":["generations","list-files"]},{"command":["drafts","list"]},{"command":["drafts","get"]},{"command":["drafts","update"]},{"command":["drafts","list-files"]},{"command":["drafts","resolve"]},{"command":["drafts","recover"]},{"command":["releases","list"]},{"command":["releases","get"]},{"command":["releases","retry"]},{"command":["files","get"]},{"command":["generate","run"]},{"command":["generate","download-package"]},{"command":["organization","get"]},{"command":["api-keys","list"]},{"command":["api-keys","get"]},{"command":["api-keys","revoke"]}],"executableName":"typeship","operationSpecs":[{"resource":"projects","method":"list","command":["projects","list"],"tool":"projects_list","httpMethod":"GET","path":"/projects"},{"resource":"projects","method":"create","command":["projects","create"],"tool":"projects_create","httpMethod":"POST","path":"/projects"},{"resource":"projects","method":"get","command":["projects","get"],"tool":"projects_get","httpMethod":"GET","path":"/projects/{project_id}"},{"resource":"projects","method":"delete","command":["projects","delete"],"tool":"projects_delete","httpMethod":"DELETE","path":"/projects/{project_id}"},{"resource":"projects","method":"update","command":["projects","update"],"tool":"projects_update","httpMethod":"PATCH","path":"/projects/{project_id}"},{"resource":"projects","method":"generate","command":["projects","generate"],"tool":"projects_generate","httpMethod":"POST","path":"/projects/{project_id}/generate"},{"resource":"specs","method":"get","command":["specs","get"],"tool":"specs_get","httpMethod":"GET","path":"/specs/{spec_id}"},{"resource":"specs","method":"update","command":["specs","update"],"tool":"specs_update","httpMethod":"PATCH","path":"/specs/{spec_id}"},{"resource":"specs","method":"refresh","command":["specs","refresh"],"tool":"specs_refresh","httpMethod":"POST","path":"/specs/{spec_id}/refresh"},{"resource":"specRevisions","method":"list","command":["spec-revisions","list"],"tool":"spec_revisions_list","httpMethod":"GET","path":"/spec-revisions"},{"resource":"specRevisions","method":"get","command":["spec-revisions","get"],"tool":"spec_revisions_get","httpMethod":"GET","path":"/spec-revisions/{spec_revision_id}"},{"resource":"specRevisions","method":"listFiles","command":["spec-revisions","list-files"],"tool":"spec_revisions_list_files","httpMethod":"GET","path":"/spec-revisions/{spec_revision_id}/files"},{"resource":"targets","method":"list","command":["targets","list"],"tool":"targets_list","httpMethod":"GET","path":"/targets"},{"resource":"targets","method":"create","command":["targets","create"],"tool":"targets_create","httpMethod":"POST","path":"/targets"},{"resource":"targets","method":"get","command":["targets","get"],"tool":"targets_get","httpMethod":"GET","path":"/targets/{target_id}"},{"resource":"targets","method":"delete","command":["targets","delete"],"tool":"targets_delete","httpMethod":"DELETE","path":"/targets/{target_id}"},{"resource":"targets","method":"update","command":["targets","update"],"tool":"targets_update","httpMethod":"PATCH","path":"/targets/{target_id}"},{"resource":"targets","method":"adopt","command":["targets","adopt"],"tool":"targets_adopt","httpMethod":"POST","path":"/targets/{target_id}/adopt"},{"resource":"deliveries","method":"list","command":["deliveries","list"],"tool":"deliveries_list","httpMethod":"GET","path":"/deliveries"},{"resource":"deliveries","method":"create","command":["deliveries","create"],"tool":"deliveries_create","httpMethod":"POST","path":"/deliveries"},{"resource":"deliveries","method":"get","command":["deliveries","get"],"tool":"deliveries_get","httpMethod":"GET","path":"/deliveries/{delivery_id}"},{"resource":"deliveries","method":"delete","command":["deliveries","delete"],"tool":"deliveries_delete","httpMethod":"DELETE","path":"/deliveries/{delivery_id}"},{"resource":"deliveries","method":"update","command":["deliveries","update"],"tool":"deliveries_update","httpMethod":"PATCH","path":"/deliveries/{delivery_id}"},{"resource":"generations","method":"get","command":["generations","get"],"tool":"generations_get","httpMethod":"GET","path":"/generations/{generation_id}"},{"resource":"generations","method":"list","command":["generations","list"],"tool":"generations_list","httpMethod":"GET","path":"/generations"},{"resource":"generations","method":"listFiles","command":["generations","list-files"],"tool":"generations_list_files","httpMethod":"GET","path":"/generations/{generation_id}/files"},{"resource":"drafts","method":"list","command":["drafts","list"],"tool":"drafts_list","httpMethod":"GET","path":"/drafts"},{"resource":"drafts","method":"get","command":["drafts","get"],"tool":"drafts_get","httpMethod":"GET","path":"/drafts/{draft_id}"},{"resource":"drafts","method":"update","command":["drafts","update"],"tool":"drafts_update","httpMethod":"PATCH","path":"/drafts/{draft_id}"},{"resource":"drafts","method":"listFiles","command":["drafts","list-files"],"tool":"drafts_list_files","httpMethod":"GET","path":"/drafts/{draft_id}/files"},{"resource":"drafts","method":"resolve","command":["drafts","resolve"],"tool":"drafts_resolve","httpMethod":"POST","path":"/drafts/{draft_id}/resolve"},{"resource":"drafts","method":"recover","command":["drafts","recover"],"tool":"drafts_recover","httpMethod":"POST","path":"/drafts/{draft_id}/recover"},{"resource":"releases","method":"list","command":["releases","list"],"tool":"releases_list","httpMethod":"GET","path":"/releases"},{"resource":"releases","method":"get","command":["releases","get"],"tool":"releases_get","httpMethod":"GET","path":"/releases/{release_id}"},{"resource":"releases","method":"retry","command":["releases","retry"],"tool":"releases_retry","httpMethod":"POST","path":"/releases/{release_id}/retry"},{"resource":"files","method":"get","command":["files","get"],"tool":"files_get","httpMethod":"GET","path":"/files/{file_id}"},{"resource":"generate","method":"run","command":["generate","run"],"tool":"generate_run","httpMethod":"POST","path":"/generate"},{"resource":"generate","method":"downloadPackage","command":["generate","download-package"],"tool":"generate_download_package","httpMethod":"GET","path":"/generate/download"},{"resource":"organization","method":"get","command":["organization","get"],"tool":"organization_get","httpMethod":"GET","path":"/organization"},{"resource":"apiKeys","method":"list","command":["api-keys","list"],"tool":"api_keys_list","httpMethod":"GET","path":"/api-keys"},{"resource":"apiKeys","method":"get","command":["api-keys","get"],"tool":"api_keys_get","httpMethod":"GET","path":"/api-keys/{api_key_id}"},{"resource":"apiKeys","method":"revoke","command":["api-keys","revoke"],"tool":"api_keys_revoke","httpMethod":"POST","path":"/api-keys/{api_key_id}/revoke"}]};

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
