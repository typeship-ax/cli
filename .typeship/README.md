# Typeship files

Typeship proposes these files in a Draft. Review and merge the Draft to accept them. Generated package files stay in the Target's configured directory.

| Path | Purpose |
| --- | --- |
| `.typeship/README.md` | This file and the release flow. |
| `.typeship/run-package-checks.mjs` | Runs the checks configured for each Target. |
| `.typeship/targets/<target-id>-checks.json` | Check commands and package directory for one Target. |
| `.typeship/targets/<target-id>-surface.mjs` | Verifies the generated public surface for one Target. |
| `.typeship/targets/<target-id>.json` | Accepted source identity, version, release notes, tag, and publishing destinations. Present when publish on merge is enabled. |
| `.typeship/conflicts/<target-id>.json` | Review details while a Draft has unresolved file conflicts; removed after resolution. |
| `<target-directory>/.typeship/surface.json` | Accepted package and API baseline for later Drafts. At the repository root when the Target directory is empty. |
| `<target-directory>/.typeship/.gitattributes` | Marks the surface baseline as generated in GitHub reviews. At the repository root when the Target directory is empty. |
| `<target-directory>/CHANGELOG.md` | Customer history plus one Typeship-owned entry for the pending release. At the repository root when the Target directory is empty. |
| `.github/workflows/typeship-<target-id>-checks.yml` | Runs the Target's package checks on its Draft. |
| `.github/workflows/typeship-release.yml` | Publishes the accepted release after merge. Present when publish on merge is enabled. |
| `.github/workflows/typeship-republish.yml` | Retries publishing an exact accepted release. Present when publish on merge is enabled. |

The workflow files remain in `.github/workflows/` because GitHub Actions loads them there. Typeship installs missing workflow files and proposes supported reader updates through a Draft. Your repository owns subsequent workflow changes.

Merge a checked Draft to make its version Current. The release workflow reads the accepted Target manifest at that commit, creates the canonical tag and GitHub Release, and publishes configured registries. Republish selects an exact Target and version. Typeship never needs your registry credentials or pushes to the default branch.

See https://typeship.dev/docs/guides/publish for setup, file ownership, and recovery.
