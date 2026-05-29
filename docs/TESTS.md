# Tests

## Architecture Overview

The test suite validates the server's shell script generation pipeline across two tiers:

**Tier 1 — Snapshot tests**: Call `runSrv()` directly with synthetic `Request` objects and snapshot the generated script
as text. These are fast, require no Docker or real shells, and exercise the full TypeScript + snippet assembly pipeline.

**Tier 2 — Syntax checks**: Feed each generated script through its shell's parser (`nu`, `zsh`, `pwsh`) to catch syntax
errors. If a shell binary is not installed, its checks are silently skipped — no hard failure.

Snapshot files are committed to the repo under `src/cmd/__snapshots__/`, so script diffs are visible in PRs.

## Running Tests

```bash
# Run all tests (Tier 1 + Tier 2)
deno task test

# Generate or regenerate snapshots (first run, or after intentional changes)
deno task test:update
```

The test tasks set `WUT_ENV=test` automatically, which loads `settings-test.toml` so config resolves correctly.

## Updating Snapshots

When you intentionally change a snippet, template, or server logic:

1. Run `deno task test:update` to regenerate snapshots.
2. Review the diff in `src/cmd/__snapshots__/` to confirm only expected output changed.
3. Commit the updated snapshots alongside your code changes.

During CI, run `deno task test` (without `--update`) — any unexpected script change will fail the test.

## Test Coverage

### `src/cmd/pack_snap_test.ts`

Package manager commands — nu × all supported managers × all 7 ops (`add`, `find`, `list`, `out`, `rem`, `sync`,
`tidy`):

| Shell | Platforms / managers                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| nu    | alpine (apk), arch (yay+pacman), ubuntu (apt), rocky (dnf), void (xbps), suse (zypper), darwin (brew), winnt (choco+scoop+winget) |
| nu    | no-sys params → bootstrap script                                                                                                  |

### `src/cmd/virt_snap_test.ts`

Virtual machine management — nu × all platforms × all ops (`add`, `find`, `list`, `rem`, `sync`, `tidy`):

| Shell | Platforms                                                     |
| ----- | ------------------------------------------------------------- |
| nu    | linux (docker+qemu), darwin (docker), winnt (docker)          |
| nu    | linux with `sysHost` — exercises real instance config loading |

### `src/cmd/file_snap_test.ts`

Dotfile synchronization — nu × all platforms × all ops (`diff`, `find`, `list`, `sync`):

| Shell | Platforms            |
| ----- | -------------------- |
| nu    | linux, darwin, winnt |

### `src/cmd/script_snap_test.ts`

Script discovery and execution — all shells × all platforms:

| Shell | Platforms               |
| ----- | ----------------------- |
| nu    | linux → native redirect |
| nu    | winnt → native redirect |
| pwsh  | winnt                   |
| zsh   | darwin, linux           |

### `src/sh_test.ts`

pwsh/zsh → nu redirect — one representative op per command per shell:

| Shell | Commands redirected to nu                            |
| ----- | ---------------------------------------------------- |
| pwsh  | file/find, file/sync, pack/add, pack/find, virt/list |
| zsh   | file/find, file/sync, pack/add, pack/find, virt/list |

## Adding New Test Cases

1. Add a new `Deno.test` entry to the appropriate file (or create a new test file).
2. Call `runSrv(req('/sh/...'))`, snapshot the body with `assertSnapshot`, then call `checkSyntax`.
3. Run `deno task test:update` to generate the initial snapshot.
4. Commit both the test and the snapshot.

```typescript
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

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
