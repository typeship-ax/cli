# typeship: agent guide

Instructions for coding agents that call the typeship API through this CLI (API version 1.0.0, package version 0.23.0).

Resolve an OpenAPI or GraphQL Spec, diagnose it, and keep every
selected CLI, MCP, and SDK Target current.

Every operation but one requires a bearer credential: an organization
API key from the console, or an OAuth access token carrying the operation's
read, generate, or write capability and the organization selected during
consent. OAuth grants cannot switch organizations after consent. A browser
session is not a credential for this API. The exception is POST /generate,
which works anonymously with the free plan's limits.

Examples use Parcel, a fictional delivery service. Replace its domains,
repository names, and resource identifiers with your own. The hosted
petstore Spec is a runnable sample.

## Before writing code
- `api.md` is the command and flag reference; `api.json` is the machine-readable contract: every operation's inputs, outputs, errors, `safety` (`read`, `write`, or `destructive`), and an example. Look up exact names there instead of guessing.
- `README.md` covers installation and setup.
- Zero runtime dependencies; the program runs on Node.js 20+ and platform `fetch`.

## Authentication
- Bearer token: set the `TYPESHIP_API_KEY` environment variable.

## Using the CLI
- `typeship <resource> <command>` calls an API operation; `typeship docs search <term> --json` finds operations and guides as structured data; `typeship docs <resource> <command>` gives a concise contract and example (add `--schema` for full schemas or `--json` for the machine contract).
- Path parameters are positional; other inputs are flags. JSON goes to stdout and exit codes are 0/1/2. Errors are one JSON envelope on stderr: `{status, issues: [{code, message}], next_steps, detail}`; branch on `issues[].code`. Every operation classified as destructive requires `--force` (or `--yes`).
- `typeship agent-guide --format json` explains the conventions; `typeship help --json` is the command surface as data; `typeship doctor` checks the setup. Read `typeship init --help` before setup: it can store credentials and update agent instructions. Choose the scope the task requires.

## Safety
- Read credentials from the environment or a secret store. Never hard-code them, print them, or put them in URLs or command arguments.
- Check an operation's `safety` in `api.json` before calling it. Confirm with the user before running a `write` or `destructive` operation they did not ask for.
- Destructive commands stop for confirmation unless `--force` (or `--yes`) is passed. Pass it only when the user asked for that change.
- Keep results small: select only the fields you need with `--fields` (CLI).

## Documentation
- The reference for this exact package: `api.md` (offline, always current with the code).
- Conceptual guides live on the docs site. For questions about how the API's concepts fit together (flows, ordering, environments), fetch `https://typeship.dev/llms-full.txt` and read the relevant sections; `https://typeship.dev/llms.txt` is the page index. Relative links in the spec resolve against `https://typeship.dev`.
