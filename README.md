# @typeship-ax/cli

CLI for typeship. [API reference](./api.md)

Generated from the OpenAPI spec by [typeship](https://typeship.dev). Change the spec or generation settings, then regenerate; generated files are not hand-edited.

- **Zero runtime dependencies** — built on the platform `fetch` (Node 18+, browsers, edge runtimes)
- **Spec-native CLI** — every operation is a command with typed flags, stable JSON, help, and exit codes

## Install

```sh
npm install @typeship-ax/cli
```

## CLI

The package ships `typeship`, a command for every API operation. It writes JSON to stdout and uses exit codes 0/1/2 for success, request failure, and invalid usage.

```sh
npm install -g @typeship-ax/cli
typeship login                      # stores a credential (or set TYPESHIP_TOKEN)
typeship projects list
typeship projects list --all | jq -r '.id'   # every page, one item per line
typeship <resource> <command> --help     # flags, types, an example
```

CLI conventions:

- Path parameters are positional; query and body fields are flags named after their wire fields.
- Arrays accept a comma list or repeated flags. Objects accept JSON; `--data @file` and `--data -` read a full body.
- `--fields id,name` projects results. `--all` streams paginated results as NDJSON.
- Destructive commands require confirmation or `--force`. Piped errors are stable JSON on stderr.

Auth: `typeship login` stores a credential under `~/.config/typeship/`; the environment (`TYPESHIP_TOKEN`) and flags (`--token`) win over it. `TYPESHIP_BASE_URL` / `--base-url` pick the endpoint.

Useful commands:

- `typeship init` configures credentials and repository agent instructions.
- `typeship docs search <term>`, `typeship doctor`, and `typeship help --json` cover discovery and diagnostics.
