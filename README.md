# @typeship-ax/cli

CLI for the typeship API. [API reference](./api.md)

Resolve an OpenAPI or GraphQL Spec, diagnose it, and keep every selected CLI, MCP, and SDK Target current.

## Installation

```sh
npm install --global @typeship-ax/cli@0.23.0
```

Requires Node.js 20+.

## Usage

The package ships `typeship`, a command for every API operation. API commands write JSON to stdout; discovery commands offer `--json`. Exit codes 0/1/2 mean success, request failure, and invalid usage.

```sh
typeship login # stores a credential (or set TYPESHIP_API_KEY)
typeship organization get
typeship projects list --all # every page, one item per line
typeship help --json # command names, flags, and types
```

CLI conventions:

- Path parameters are positional; query and body fields are flags named after their wire fields.
- Arrays accept a comma list or repeated flags. Objects accept JSON; `--data @file` and `--data -` read a full body.
- `--fields id,name` projects results. `--all` streams paginated results as NDJSON.
- Destructive commands require confirmation or `--force`. Piped errors are stable JSON on stderr.

Auth: `typeship login` stores a credential under `~/.config/typeship/profiles/default/`; the environment (`TYPESHIP_API_KEY`) and flags (`--token`) win over it. `TYPESHIP_BASE_URL` / `--base-url` pick the endpoint.

Headers the spec does not declare: `--header "Name: value"` (repeatable) or `TYPESHIP_HEADERS` (a JSON object, or one `Name: value` per line). They are sent on every request and replace any header of the same name the CLI would send.

Use `typeship login --profile work` for a separate login, `typeship auth use work` to select it, and `typeship auth profiles` to list profiles without exposing tokens. Selection follows `--profile`, then `TYPESHIP_PROFILE`, then the saved selection, then `default`. Profiles isolate saved settings and credentials; an API or environment change requires another login before using the saved credential.

Useful commands:

- `typeship init` configures credentials and repository agent instructions.
- `typeship docs search <term> --json`, `typeship doctor`, and `typeship help --json` cover discovery and diagnostics.

Generated from the OpenAPI spec by [typeship](https://typeship.dev).
