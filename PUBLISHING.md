# Publishing typeship

How to build, release, and maintain this CLI. Its users need only [README.md](README.md).

## Build and test

Requires Go 1.21 or later. From this directory:

```sh
go build -o typeship .
./typeship --help
go vet ./...
go test ./...
```

The API client is included in this package. Build and release the CLI on its own.

## Publish the module

`go.mod` declares `github.com/typeship-ax/cli`. Set it to the repository path you publish from, then push a `v<major>.<minor>.<patch>` tag. Users install a release with `go install github.com/typeship-ax/cli@<version>`.

## Release archives

`.goreleaser.yml` builds and packages every supported platform from one
checkout with reproducible flags (`-trimpath`, a pinned module timestamp,
CGO off): the same commit produces the same bytes.

With Typeship publishing on, the release workflow builds these archives and
attaches them with `checksums.txt` to the GitHub Release. To build them
yourself, from this directory:

```sh
goreleaser build --snapshot --clean   # local matrix build into dist/
goreleaser release --clean            # tag-driven archives + checksums
```

Other GOOS/GOARCH combinations (freebsd, 386, armv7, riscv64, ...) are not
built by this configuration; they build with the same flags, without
support guarantees:

```sh
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o typeship.exe .
```

## Customizing this package

- A custom file ships only when the package manifest, exports, build, and tests include it. Add a package check for every custom build or test step.
- Keep application-only wrappers outside this package. Code shipped from this package must pass the package's checks.
- When this package's repository receives reviewed regeneration pull requests, committed customizations are preserved and edits that overlap a generated change stop for review. Regenerating into a directory replaces its files.
