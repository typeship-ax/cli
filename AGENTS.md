# typeship — agent context

This package contains the generated CLI for **typeship** (v1.0.0).

Resolve an OpenAPI or GraphQL Definition, diagnose it, and keep every
selected SDK, CLI, and MCP Target current.

Every operation but one requires a bearer credential: an organization
API key from the console, or a Clerk OAuth token carrying the operation's
read, generate, or write capability and the organization selected during
consent. OAuth grants cannot switch organizations after consent. A browser
session is not a credential for this API. The exception is POST /generate,
which works anonymously with the free plan's limits.

## Ground rules
- Generated code: never edit files in this package by hand — changes are lost on regeneration. Wrap the client in your own code instead.
- Zero runtime dependencies; everything runs on platform `fetch` (Node 18+, browsers, edge).
- `api.md` is the native method reference; `api.json` is the machine-readable operation, schema, safety, and example contract. Read them before guessing.

## Authentication
- Bearer token: set the `TYPESHIP_TOKEN` environment variable.

## Using the CLI
- `typeship <resource> <command>` exposes the same API operations as the SDK; `typeship docs search <term> --json` finds operations and guides as structured data; `typeship docs <resource> <command>` gives a concise contract and example (add `--schema` for full schemas or `--json` for the machine contract).
- Path parameters are positional; other inputs are flags. JSON goes to stdout and exit codes are 0/1/2. Errors are one JSON envelope on stderr: `{status, issues: [{code, message}], next_steps, detail}`; branch on `issues[].code`. Every operation classified as destructive requires `--force` (or `--yes`).
- `typeship agent-guide --format json` explains the conventions; `typeship help --json` is the command surface as data; `typeship init --all` connects this machine (credential, MCP clients, an AGENTS.md block); `typeship doctor` checks it.

## Documentation
- The reference for this exact package: `api.md` (offline, always current with the code).
- Conceptual guides live on the docs site. For questions about how the API's concepts fit together (flows, ordering, environments), fetch `https://typeship.dev/llms-full.txt` and read the relevant sections; `https://typeship.dev/llms.txt` is the page index.
