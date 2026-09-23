# typeship — agent context

This package contains the generated CLI for **typeship** (API v1.0.0, package v0.14.2).

Resolve an OpenAPI or GraphQL Definition, diagnose it, and keep every
selected CLI, MCP, and SDK Target current.

Every operation but one requires a bearer credential: an organization
API key from the console, or an OAuth access token carrying the operation's
read, generate, or write capability and the organization selected during
consent. OAuth grants cannot switch organizations after consent. A browser
session is not a credential for this API. The exception is POST /generate,
which works anonymously with the free plan's limits.

Examples use Parcel, a fictional delivery service. Replace its domains,
repository names, and resource identifiers with your own. The hosted
petstore Definition is a runnable sample.

## Ground rules
- For a linked repository Delivery, commit package customizations to the rolling Draft. Typeship three-way merges those commits with the next unmodified Generation, preserves exact bytes and file modes, and stops for explicit review when both sides touch the same region or file ownership is ambiguous.
- A preserved file participates in the combined package only when the package manifest, exports, build, and tests include it. Configure Target checks for every custom build or test requirement; do not assume a file is published merely because it survives regeneration.
- Zero runtime dependencies; the program runs on Node.js 18+ and platform `fetch`.
- `api.md` is the command and flag reference; `api.json` is the machine-readable operation, schema, safety, and example contract. Read them before guessing.
- Start with the local build or installation instructions in `README.md`. Generation does not publish a registry package.

## Authentication
- Bearer token: set the `TYPESHIP_TOKEN` environment variable.

## Using the CLI
- `typeship <resource> <command>` calls an API operation; `typeship docs search <term> --json` finds operations and guides as structured data; `typeship docs <resource> <command>` gives a concise contract and example (add `--schema` for full schemas or `--json` for the machine contract).
- Path parameters are positional; other inputs are flags. JSON goes to stdout and exit codes are 0/1/2. Errors are one JSON envelope on stderr: `{status, issues: [{code, message}], next_steps, detail}`; branch on `issues[].code`. Every operation classified as destructive requires `--force` (or `--yes`).
- `typeship agent-guide --format json` explains the conventions; `typeship help --json` is the command surface as data; `typeship doctor` checks the setup. Read `typeship init --help` before setup: it can store credentials and update agent instructions. Choose the scope the task requires.

## Documentation
- The reference for this exact package: `api.md` (offline, always current with the code).
- Conceptual guides live on the docs site. For questions about how the API's concepts fit together (flows, ordering, environments), fetch `https://typeship.dev/llms-full.txt` and read the relevant sections; `https://typeship.dev/llms.txt` is the page index. Relative links in the spec resolve against `https://typeship.dev`.
