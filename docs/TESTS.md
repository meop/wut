# Tests

## Architecture Overview

The test suite validates the server's shell script generation pipeline across three tiers:

**Tier 1 — Snapshot tests**: Call `runSrv()` directly with synthetic `Request` objects and snapshot the generated script
as text. These are fast, require no Docker or real shells, and exercise the full TypeScript + snippet assembly pipeline.

**Tier 2 — Syntax checks**: Feed each generated script through its shell's parser (`nu`, `zsh`, `pwsh`) to catch syntax
errors. If a shell binary is not installed, its checks are silently skipped — no hard failure.

**Tier 3 — Client decisions**: Run a nu snippet for real, against a PATH built for the test, and assert what it answers.
Only for the decisions the server cannot make, since they read the machine (`src/sh/nu/pack_test.ts`). Skipped the same
way when `nu` is missing.

Snapshot files are committed to the repo under `src/cmd/__snapshots__/`, so script diffs are visible in PRs.

## Running Tests

```bash
# Run all tests (every tier)
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

| Shell | Platforms / managers                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| nu    | alpine (apk), arch (pacman family), ubuntu (apt), rocky (dnf), void (xbps), suse (zypper), darwin (brew), windows (winget+choco+scoop) |
| nu    | no-sys params → bootstrap script                                                                                                       |

### `src/cmd/virt_snap_test.ts`

Virtual machine management — nu × all platforms × all ops (`add`, `find`, `list`, `rem`, `sync`, `tidy`):

| Shell | Platforms                                                     |
| ----- | ------------------------------------------------------------- |
| nu    | linux (docker+qemu), darwin (docker), windows (docker)        |
| nu    | linux with `sysHost` — exercises real instance config loading |

### `src/cmd/file_snap_test.ts`

Dotfile synchronization — nu × all platforms × all ops (`diff`, `find`, `list`, `sync`):

| Shell | Platforms              |
| ----- | ---------------------- |
| nu    | linux, darwin, windows |

### `src/cmd/script_snap_test.ts`

Script discovery and execution — all shells × all platforms:

| Shell | Platforms      |
| ----- | -------------- |
| nu    | linux, windows |
| pwsh  | windows        |
| zsh   | darwin, linux  |

### `src/sh_test.ts`

pwsh/zsh → nu redirect — one representative op per command per shell:

| Shell | Commands redirected to nu                                         |
| ----- | ----------------------------------------------------------------- |
| pwsh  | file/find, file/sync, pack/add, pack/find, virt/list, script/exec |
| zsh   | file/find, file/sync, pack/add, pack/find, virt/list, script/exec |

### `src/sh/nu/pack_test.ts`

Tier 3 — the client's own decisions. Some of what wut emits is only answerable where `which` runs, so `runNu` sources
the nu op preamble and `src/sh/nu/pack.nu` against a PATH of stub binaries and asserts what it returns. That covers
collapsing the `paru`/`yay`/`pacman` family to one manager (see [PACK.md](PACK.md#the-pacman-family-is-one-manager)),
and remove resolving a name to the manager that actually has it (see
[PACK.md](PACK.md#add-and-remove-ask-different-questions)). The stubs for the second carry bodies — the real listing
formats — since parsing them is the thing under test. Like Tier 2, it skips silently when `nu` is not installed.

A decision this tier does not reach is the one a snapshot cannot see either: a snapshot pins the script wut sends, so a
check that is emitted, looks right, and answers the wrong question still snapshots clean. That is what let `remove`
resolve a name by asking who _could_ install it. Anything the client decides for itself belongs here, not only in a
snapshot.

## Following the redirect: `wutNuPinned=1`

Every command calls `redirectCommonShell` first, so **any** request without `wutNuPinned=1` in its query string renders
the hop to the pinned nu and nothing else — group listings, manager calls, path pairs and filters are all on the far
side of it. A snapshot taken without the param asserts the bootstrap, not the op.

Both forms are worth having. Without the param, the test pins the hop URL; with it, the test pins what the client
actually runs:

```typescript
// the hop
runSrv(req('/sh/nu/pack/find?sysOsPlat=linux&sysOs=arch'))
// the body
runSrv(req('/sh/nu/pack/find?sysOsPlat=linux&sysOs=arch&wutNuPinned=1'))
```

`script` redirects like the rest, so its tests pass `wutNuPinned=1` to reach the body rather than the hop.

## Adding New Test Cases

1. Add a new `Deno.test` entry to the appropriate file (or create a new test file).
2. Call `runSrv(req('/sh/...'))`, snapshot the body with `assertSnapshot`, then call `checkSyntax`.
3. For `pack`/`file`/`virt`, add `wutNuPinned=1` if the test is about the op rather than the hop.
4. Run `deno task test:update` to generate the initial snapshot.
5. Commit both the test and the snapshot.

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
