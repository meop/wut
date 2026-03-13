# Testing

## Architecture Overview

The test suite validates the server's shell script generation pipeline across two tiers:

**Tier 1 — Snapshot tests**: Call `runSrv()` directly with synthetic `Request` objects and snapshot the generated script
as text. These are fast, require no Docker or real shells, and exercise the full TypeScript + snippet assembly pipeline.

**Tier 2 — Syntax checks**: Feed each generated script through its shell's parser (`nu`, `zsh`, `pwsh`) to catch syntax
errors. If a shell binary is not installed, its checks are silently skipped — no hard failure.

Snapshot files are committed to the repo under `tests/snapshot/__snapshots__/`, so script diffs are visible in PRs.

## Running Tests

```bash
# Run all tests (Tier 1 + Tier 2)
deno task test

# Generate or regenerate snapshots (first run, or after intentional changes)
deno task test:update
```

The test tasks pass `--env-file=.env.test` automatically, which sets `CFG_DIRS=wut-config` so config resolves correctly.

## Updating Snapshots

When you intentionally change a snippet, template, or server logic:

1. Run `deno task test:update` to regenerate snapshots.
2. Review the diff in `tests/snapshot/__snapshots__/` to confirm only expected output changed.
3. Commit the updated snapshots alongside your code changes.

During CI, run `deno task test` (without `--update`) — any unexpected script change will fail the test.

## Test Coverage

### `tests/snapshot/pack.test.ts`

Package manager commands — all shells × all supported managers × all 7 ops (`add`, `find`, `list`, `out`, `rem`, `sync`,
`tidy`):

| Shell | Platforms / managers                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------ |
| nu    | arch (yay+pacman), ubuntu (apt), rocky (dnf), suse (zypper), darwin (brew), winnt (choco+scoop+winget) |
| nu    | no-sys params → bootstrap script                                                                       |
| pwsh  | winnt (choco+scoop+winget)                                                                             |
| zsh   | arch, ubuntu, rocky, suse, darwin                                                                      |

### `tests/snapshot/virt.test.ts`

Virtual machine management — nu × all platforms × all ops (`add`, `find`, `list`, `rem`, `sync`, `tidy`):

| Shell | Platforms                                            |
| ----- | ---------------------------------------------------- |
| nu    | linux (docker+qemu), darwin (docker), winnt (docker) |

### `tests/snapshot/file.test.ts`

Dotfile synchronization — nu × all platforms × all ops (`diff`, `find`, `sync`):

| Shell | Platforms            |
| ----- | -------------------- |
| nu    | linux, darwin, winnt |

## Adding New Test Cases

1. Add a new `Deno.test` entry to the appropriate file (or create a new test file).
2. Call `runSrv(req('/sh/...'))`, snapshot the body with `assertSnapshot`, then call `checkSyntax`.
3. Run `deno task test:update` to generate the initial snapshot.
4. Commit both the test and the snapshot.

```typescript
import { assertSnapshot } from '@std/testing/snapshot'
import { runSrv } from '../../src/srv.ts'
import { checkSyntax, req } from '../helpers.ts'

Deno.test('nu / arch / new-op', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/new-op?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
```

## Shell Syntax Checkers

| Shell | Command                                                          |
| ----- | ---------------------------------------------------------------- |
| nu    | `echo body \| nu --no-config-file --ide-check 100`               |
| zsh   | `zsh -n <tempfile>`                                              |
| pwsh  | `[System.Management.Automation.Language.Parser]::ParseFile(...)` |

If a shell binary is not found, its syntax check is silently skipped. The snapshot test still runs.
