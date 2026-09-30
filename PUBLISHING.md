# Publishing @typeship-ax/cli

How to build, release, and maintain this package. Its users need only [README.md](README.md).

## Build and test

Requires Node.js 20+. From this directory:

```sh
npm install
npm run build
npm test
```

## Name and version

`package.json` names this package `@typeship-ax/cli` at version `0.23.2`. Raise `version` for every release.

## Publish

```sh
npm publish --access public
```

`prepublishOnly` builds the package first.

## Customizing this package

- A custom file ships only when the package manifest, exports, build, and tests include it. Add a package check for every custom build or test step.
- Keep application-only wrappers outside this package. Code shipped from this package must pass the package's checks.
- When this package's repository receives reviewed regeneration pull requests, committed customizations are preserved and edits that overlap a generated change stop for review. Regenerating into a directory replaces its files.
