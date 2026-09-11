# @typeship-ax/cli

CLI for typeship. [API reference](./api.md)

Generated from the OpenAPI spec by [typeship](https://typeship.dev). Change the spec or generation settings, then regenerate; generated files are not hand-edited.

- **Zero runtime dependencies** — built on the platform `fetch` in Node 18+
- **Spec-native CLI** — every operation is a command with typed flags, stable JSON, help, and exit codes

## Build from source

Run these commands in the downloaded or cloned package directory:

```sh
npm install
npm run build
node dist/cli.js --help
```

Requires Node.js 18+. The package is ESM.

## Install a published package

Generation does not publish a package. Before using the registry command below, confirm `name` and `version` in `package.json`, publish under a name you control, and verify that release is available on npm.

```sh
npm install --global @typeship-ax/cli@0.9.0
```

## CLI

The package ships `typeship`, a command for every API operation. API commands write JSON to stdout; discovery commands offer `--json`. Exit codes 0/1/2 mean success, request failure, and invalid usage.

```sh
node dist/cli.js login # stores a credential (or set TYPESHIP_TOKEN)
node dist/cli.js account retrieve
node dist/cli.js projects list --all # every page, one item per line
node dist/cli.js help --json # command names, flags, and types
```

These examples run from the package directory. After a global installation, use `typeship` in place of `node dist/cli.js`.

CLI conventions:

- Path parameters are positional; query and body fields are flags named after their wire fields.
- Arrays accept a comma list or repeated flags. Objects accept JSON; `--data @file` and `--data -` read a full body.
- `--fields id,name` projects results. `--all` streams paginated results as NDJSON.
- Destructive commands require confirmation or `--force`. Piped errors are stable JSON on stderr.

Auth: `typeship login` stores a credential under `~/.config/typeship/profiles/default/`; the environment (`TYPESHIP_TOKEN`) and flags (`--token`) win over it. `TYPESHIP_BASE_URL` / `--base-url` pick the endpoint.

Use `typeship login --profile work` for a separate login, `typeship auth use work` to select it, and `typeship auth profiles` to list profiles without exposing tokens. Selection follows `--profile`, then `TYPESHIP_PROFILE`, then the saved selection, then `default`. Profiles isolate saved settings and credentials; an API or environment change requires another login before using the saved credential.

Useful commands:

- `typeship init` configures credentials and repository agent instructions.
- `typeship docs search <term> --json`, `typeship doctor`, and `typeship help --json` cover discovery and diagnostics.
