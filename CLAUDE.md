# CLAUDE.md

## Project

Server-side rendered shell scripts delivered over HTTP. Shells make GET requests; the server generates and returns
complete shell scripts that the shell executes locally. Supports nushell, PowerShell, and zsh.

**Dependencies:**

- **shire** (`@meop/shire`) — shell abstraction library (cmd parsing, shell-specific syntax generation)
- **wut-config** — config files (package definitions, dotfile mappings, scripts) — loaded via `WUT_CFG_DIR` env var

## Development Commands

```bash
deno task check           # type check
deno task format          # apply formatting (modifies files)
deno task format:check    # verify formatting without modifying (CI / pre-commit)
deno task lint            # lint
deno task start           # development mode with hot reload
deno task start:systemd   # start via systemd
deno task stop:systemd    # stop via systemd
deno task test            # run tests (snapshot + syntax)
deno task test:update     # regenerate snapshots after intentional changes
```

### After Making Changes

1. `deno task format` — apply formatting
2. `deno task lint` — fix errors, return to step 1 if any
3. `deno task test` — if snapshot tests fail due to intentional output changes: `deno task test:update`, then review
   `git diff src/cmd/__snapshots__/` — Tier 2 syntax check is automatic; semantic correctness requires human review

### Dependency Management

- `deno outdated` — check for available updates
- `deno update` — update lockfile within version constraints
- `deno update --latest` — update deno.json and lockfile to absolute latest

## Code Formatting

Deno formatting rules (deno.json):

- No semicolons
- Single quotes
- Trailing commas only on multiline
- Always use curly braces for `if` statement bodies, with body on next line

### Import Sorting

Imports must be organized into 3 groups with a single empty line between each group, and sorted alphabetically by source
within each group:

1. Built-in modules (e.g., `node:*`)
2. External packages (e.g., `@cross/*`, `@meop/shire`, `@std/*`)
3. Local project files (e.g., `./cfg.ts`, `../sh.ts`)

Example:

```typescript
import { readFileSync } from 'node:fs'

import { CmdBase } from '@meop/shire/cmd'
import { getCtx } from '@meop/shire/ctx'
import { assertEquals } from '@std/assert'

import { getCfgFileLoad } from './cfg.ts'
import { SETTINGS } from './stng.ts'
```

## Configuration Loading (`src/cfg.ts`)

Config is loaded from a single directory specified by `cfg.dir` in `settings.toml`, overrideable via the `WUT_CFG_DIR`
environment variable. The in-repo `cfg/` directory contains minimal example configs used by tests.

Two distinct loading functions:

- **`getCfgFileContent(parts)`** — raw file content. Used by the `/cfg` HTTP route for files fetched at runtime by
  nushell scripts (containerfiles, pod YAMLs).
- **`getCfgFileLoad(parts, {extension})`** — loads and parses a single config file (YAML/JSON). Used by commands that
  process config server-side (pack, file, script, virt).

## Filter Semantics

All commands use **AND semantics**: every provided filter term must match. More terms = narrower results.

Exception: single-argument pack managers loop per term, producing OR behavior — a tool limitation.

## Multi-Shell Support

The server primarily generates nushell scripts. `pwsh`/`zsh` shells are redirected to nushell equivalents for commands
with complex logic (pack, file, virt). See `file.ts`, `virt.ts`, `pack.ts` for redirect implementation.

## Nushell Pitfalls

Known nushell parsing quirks that have caused bugs in `src/sh/nu/`:

- **`[{record} | to yaml]` is a list, not a pipeline.** In nushell 0.111+, `|` inside `[...]` is a list separator.
  `[{a: 1} | to yaml]` produces the 3-element list `[{a: 1}, "to", "yaml"]`. Use `[({a: 1} | to yaml)]` with extra
  parens to force a pipeline inside a list literal.

- **Nested `$"..."` inside `$"r##'(expr)'##"`** — if `expr` contains its own `$"..."` interpolation, the inner closing
  `"` terminates the outer string. Fix by rewriting inner interpolations as string concatenation: `'exec ' + $cmd`
  instead of `$"exec ($cmd)"`.

- **`r#'...'#` with `#!` content** — nushell misparsed `r#'#` as a comment start. Use `r##'...'##` for any content that
  starts with `#` (e.g. shebangs). Fix was merged in 0.101 then reverted; see
  https://github.com/nushell/nushell/pull/14548.

- **`http get --raw` vs `http get` and `$"(...)"` wrapping** — `http get` without `--raw` auto-parses the response body
  based on content type (JSON → record, etc.), which breaks `nu -c` invocations expecting a string. Always use
  `--raw` when fetching scripts to execute. Two distinct patterns depending on intent:
  - **Execute as code**: `nu --no-config-file -c $"( http get --raw --redirect-mode follow $url )"` — `$"(...)"` converts
    the raw bytes to a string for `-c`. Safe because script responses are always valid UTF-8.
  - **Save to disk**: `http get --raw --redirect-mode follow $url | save --force $path` — pipe binary directly, no
    `$"(...)"` wrapper. Wrapping corrupts non-UTF-8 files (e.g. PNGs).

- **Bare words on the RHS of assignments are external command calls (since 0.97.0).** `$yn = y` and `let cmd = docker`
  are parse errors — nushell treats the bare word as an external command to execute, not a string literal. Always quote
  string values in assignments: `$yn = 'y'`, `let cmd = 'docker'`. Bare words ARE valid (no quotes needed) in: match
  arm patterns (`arm64 =>`), comparison operators (`$x == linux`, `$x != n`), and command argument position
  (`str starts-with record`).

- **Bare words in `in $env`/`not-in $env` checks only work without surrounding parens.** `if KEY in $env {` works,
  but `(KEY in $env)` treats the bare word as an external command (error: command not found). In compound `or`
  conditions where each clause is wrapped in `(...)`, always quote the key: `('KEY' in $env)`,
  `('KEY' not-in $env)`.

- **Unquoted absolute path at the start of a `()` subexpression pipeline is executed as a command.**
  `(/etc/os-release | path exists)` tries to execute `/etc/os-release` as an external command (error: "not
  executable"). Quote the path: `('/etc/os-release' | path exists)`.

## Testing

See [docs/TESTS.md](docs/TESTS.md) for full details on test architecture, how to update snapshots, and how to add new
test cases.

Some operations require local interactive testing and cannot be fully automated — see README.
