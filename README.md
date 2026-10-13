# Typeship CLI

CLI for the Typeship API. [Command reference](./api.md)

Resolve an OpenAPI or GraphQL Spec, diagnose it, and keep every selected CLI, MCP, and SDK Target current.

## Installation

When executable archives are published, download the archive for your operating system and architecture, verify it against `checksums.txt`, and put `typeship` on your PATH (`typeship.exe` on Windows).

Running a release executable needs no language runtime.

To build this source package, install Go 1.21 or later and run `go build -o typeship .` from this directory.

## Usage

```sh
typeship --help
typeship help --json
```

This CLI has 42 commands across 12 resources.
Use `typeship <resource> <command> --help` to discover the inputs
for an operation. Commands print JSON to stdout; errors use stderr and a nonzero exit code.
Exit codes are 0 for success, 1 for API or runtime failures, and 2 for invalid usage.

`--data` accepts inline JSON, `@path` for a file, or `-` for stdin.
Field flags override the corresponding `--data` values. Unsupported fields
and invalid integer or numeric bounds fail locally with exit code 2 and no API request.
Additional fields are preserved when the schema explicitly permits them.

Use `--read-only` or `TYPESHIP_MCP_READ_ONLY=1` to restrict command execution to reads.
Use `--tools <list>` or `TYPESHIP_MCP_TOOLS=<list>` to restrict command execution to resources, MCP tool names, or resource.method names.

## Authentication

Run `typeship login --help` for the credential inputs this API declares,
or set the authentication environment variables listed in [AGENTS.md](AGENTS.md).

## Upgrade

`typeship upgrade --check` reports current vs latest without installing.
A Go-installed CLI checks module versions through the Go module proxy (`GOPROXY`);
Executable archives check GitHub releases for a matching platform archive
and `checksums.txt`. Replace archive installs
manually after verifying the checksum. Unix Go-installed binaries update in place
when writable, preserving their installed filename. Windows and source builds
require manual replacement or rebuilding. Only `upgrade` checks versions; this
CLI does not send automatic update notices.

## Tests

`cli_test.go` checks the generated command surface offline: help and version
output, command routing, flag parsing, and the usage and confirmation errors
that stop a command before it sends a request.
Run the tests from this directory:

```sh
go test ./...
```

The tests need no credentials and make no network requests.

## Supported platforms

| OS | Architectures | Binary name |
| --- | --- | --- |
| Linux | amd64, arm64 | `typeship` |
| macOS | amd64, arm64 | `typeship` |
| Windows | amd64, arm64 | `typeship.exe` |

Every binary is a static native executable with no language runtime
dependencies.

[Command reference](api.md) · [Machine-readable contract](api.json) · [Agent instructions](AGENTS.md)

Generated from the OpenAPI spec by [Typeship](https://typeship.dev).
