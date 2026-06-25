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

## Command Matching

All ops use **AND semantics** (every filter term must match; more terms = narrower). Each op resolves filters via one of
two philosophies — **WIDE** (substring, act on all) or **PINPOINT** (exact-wins then first, act on one). See
[docs/COMMANDS.md](docs/COMMANDS.md) for the per-op table and implementation.

Config file structure (`file.yaml`, `script.yaml` gates) is documented in [docs/RULES.md](docs/RULES.md).

## Multi-Shell Support

The server primarily generates nushell scripts. `pwsh`/`zsh` shells are redirected to nushell equivalents for commands
with complex logic (pack, file, virt). See `file.ts`, `virt.ts`, `pack.ts` for redirect implementation.

## Nushell Pitfalls

`src/sh/nu/` generates nushell; several parsing quirks (raw-string depth, bare words in assignments, `[...]`
list-vs-pipeline, `http get --raw`) have caused bugs there. See [docs/NUSHELL.md](docs/NUSHELL.md) before editing
nushell output.

## Testing

See [docs/TESTS.md](docs/TESTS.md) for full details on test architecture, how to update snapshots, and how to add new
test cases.

Some operations require local interactive testing and cannot be fully automated — see README.
