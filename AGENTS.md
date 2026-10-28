# AGENTS.md

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

## Comments

No comment explains why code does what it does where a unit test can show it: the test is the explanation, and it fails
when the reasoning stops holding. A comment is only for what no test can show.

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

A typed term is put to a name one of two ways, and which depends on the op, never the command: an **acting** op (`add`,
`rem`, `sync`, `run`, `exec`, `diff`, `info`) takes a name **whole** — its own, a folder above it, or an alias — and a
**reading** op (`find`, `list`, `outdated`) takes the **start of a word** of one, and reads further (a pack group's
packages and `descr`). Never a substring, never ranked, and `rem` resolves exactly as `add` does. `src/match.ts` and
`src/sh/nu/match.nu` hold the two primitives; a new filter uses them rather than its own comparison. See
[docs/COMMANDS.md](docs/COMMANDS.md) for the per-op table.

## One Decision

Every op resolves data on the server, lets the **client** filter it by what is actually installed
(`packManagerHere`/`virtManagerHere`/`fileBinHere`/`scriptHasCmd`), summarises it as a table, and asks exactly once —
`find` included. The server never pre-renders a listing, because pre-rendered text has nowhere left to apply that
filter. See [docs/OPS.md](docs/OPS.md).

wut gates only itself: `-y` answers that one question and is never passed on as a tool's flag (`--noconfirm`, `--yes`,
`-y`). A tool's own prompts — pacman's `[Y/n]`, apt's, a binstall confirm — are between the user and the tool; do not
add flags that answer them. See [docs/PACK.md](docs/PACK.md).

## Docs

Cross-cutting:

- [docs/OPS.md](docs/OPS.md) — the shape every command shares: server resolves, client filters, one prompt
- [docs/COMMANDS.md](docs/COMMANDS.md) — how a typed term resolves to targets (a name whole vs the start of a word),
  per-op table
- [docs/RULES.md](docs/RULES.md) — config file shapes: `file.yaml`, pack group yaml, `script.yaml` gates
- [docs/NUSHELL.md](docs/NUSHELL.md) — nu parsing quirks that have caused bugs
- [docs/TESTS.md](docs/TESTS.md) — test architecture, snapshots, adding cases

Per command:

- [docs/PACK.md](docs/PACK.md) — groups, tiers, loose names, the plan
- [docs/VIRT.md](docs/VIRT.md) — instance layout, podman layers and builds, qemu variants, add vs run
- [docs/FILE.md](docs/FILE.md) — keys as bin checks, and the one op that writes
- [docs/SCRIPT.md](docs/SCRIPT.md) — shell ownership and hops, client-side `has_cmd`

## Multi-Shell Support

The server primarily generates nushell scripts. `pwsh`/`zsh` shells are redirected to nushell equivalents for commands
with complex logic (pack, file, virt). See `file.ts`, `virt.ts`, `pack.ts` for redirect implementation.

`script exec` is the exception: each script runs in the shell it is written for, and hops between shells to fan out.
That ownership and hop protocol is in [docs/SCRIPT.md](docs/SCRIPT.md).

## Nushell Pitfalls

`src/sh/nu/` generates nushell; several parsing quirks (raw-string depth, bare words in assignments, `[...]`
list-vs-pipeline, `http get --raw`) have caused bugs there. See [docs/NUSHELL.md](docs/NUSHELL.md) before editing
nushell output.

## Testing

See [docs/TESTS.md](docs/TESTS.md) for full details on test architecture, how to update snapshots, and how to add new
test cases.

Some operations require local interactive testing and cannot be fully automated — see README.
