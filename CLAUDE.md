# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Setup

This repository requires sibling repositories to be cloned:

```bash
cd /your/workspace
git clone <your-wut-repo-url>
git clone git@github.com:meop/shire.git
git clone <your-wut-config-repo-url>
git clone <your-wut-config-secret-repo-url>  # Private, optional
```

Expected directory structure:

```
workspace/
├── wut/                  (this repo)
├── shire/                (library dependency)
├── wut-config/           (config files)
└── wut-config-secret/    (private config, optional)
```

**Dependencies:**

- **shire** - Shell Interface Renderer library (published to JSR as `@meop/shire`)
- **wut-config** - Configuration files for package definitions, dotfile mappings, scripts
- **wut-config-secret** - Private configuration (optional, for sensitive configs)

## Development Commands

```bash
deno task dev             # development mode with hot reload
deno task dev:docker      # start Docker container
deno task dev:docker:down # stop Docker container
deno task fmt             # apply formatting (modifies files)
deno task fmt:check       # verify formatting without modifying (CI / pre-commit)
deno task lint            # lint
deno task check           # type check
deno task test            # run tests (snapshot + syntax)
deno task test:update     # regenerate snapshots after intentional changes
```

### Dependency Management

To keep dependencies in sync (especially `@meop/shire` in this workspace):

- `deno outdated` # check for available updates
- `deno update` # update lockfile within version constraints
- `deno update --latest` # update deno.json and lockfile to absolute latest

The server runs on port 9000 by default (configurable via PORT env var).

## Development Workflow

After making code changes, run in this order:

1. `deno task fmt` — apply formatting; always modifies files if needed
2. `deno task lint` — check for lint errors
   - If errors found: fix them, then return to step 1
3. `deno task test` — run tests
   - If snapshot tests fail due to intentional output changes: `deno task test:update`, then review
     `git diff tests/snapshot/__snapshots__/` to confirm every changed snapshot is correct and valid shell syntax for
     its target shell (Tier 2 syntax check is automatic; semantic correctness requires human review)

Use `deno task fmt:check` (no modifications) only for CI or to verify formatting before committing.

## Architecture Overview

### Server-Side Rendered Shell Scripts

The core concept is that shell scripts are **dynamically generated** on the server and delivered to shells via HTTP.
Shells execute these scripts locally using their shell.

**Request Flow:**

1. Shell makes HTTP GET request to server (e.g., `http://my-server:9000/sh/nu/pack/add/firefox`)
2. Server parses URL path to determine: shell type (nu/pwsh/zsh), command (pack), operation (add), arguments (firefox)
3. Server builds a shell script by:
   - Loading shell-specific template files from `src/sh/{nu,pwsh,zsh}/`
   - Setting variables based on context (OS, user, etc.)
   - Loading config from wut-config/wut-config-secret directories
   - Generating shell-specific code
4. Server returns complete shell script as HTTP response
5. Shell executes the script

**Shell Bootstrap Pattern:**

Each shell defines a `wut` function that builds the request URL from args and executes the returned script. See README
for setup.

### Command System

Commands are hierarchical (provided by shire library) with support for:

- Subcommands (e.g., `wut pack add firefox`)
- Aliases (e.g., `p` for `pack`, `a` for `add`)
- Options (e.g., `--manager yay`)
- Switches (e.g., `-g` for group mode)
- Arguments (e.g., package names)

The `CmdBase` class (from shire) handles argument parsing and dispatches to the appropriate `work()` method.

### Shell Abstraction

The `Sh` interface (from shire) abstracts shell-specific differences:

- String quoting/escaping (toLiteral/toElement)
- Variable setting (varSet/varSetArr/varUnSet)
- Print operations (print/printErr/printInfo/etc.)
- File loading from shell-specific directories

Each shell has a concrete implementation (Nushell, Powershell, Zshell) that knows how to generate shell-specific syntax.

### Configuration Loading (src/cfg.ts)

Configuration is loaded from multiple directories specified in `.env`:

```
CFG_DIRS=wut-config|wut-config-secret
```

Files are loaded from `../wut-config/cfg/` and `../wut-config-secret/cfg/` relative to wut directory.

Two distinct loading functions with different semantics:

- **`getCfgFileContent(parts)`** — returns raw content of the first matching file (wut-config-secret wins over
  wut-config). Used by the `/cfg` HTTP route, which nushell scripts call at runtime for files like containerfiles and
  pod YAMLs.
- **`getCfgFileLoad(parts, {extension})`** — loads ALL matching files for the same path across ALL cfg dirs and deep
  merges them. Used by commands that process config server-side (pack, file, script, virt). This is what makes those
  commands "stitch-capable" — a `wut-config-secret/cfg/file.yaml` automatically merges with `wut-config/cfg/file.yaml`.

Deep merge semantics (`@cross/deepmerge`): records merge recursively, arrays append (later dirs append to earlier),
scalars: later dirs win.

Configuration files can be:

- YAML files (`.yaml`) for structured data (package definitions, file mappings)
- Shell scripts (`.nu`, `.ps1`, `.zsh`) for executable code

### Main Commands

**pack** (src/cmd/pack.ts) - Package manager operations

- Detects OS and selects appropriate package manager (yay, pacman, apt, brew, choco, etc.)
- Supports group-based installs (packages defined in YAML config files)
- Operations: add, find, list, out, rem (remove), sync, tidy
- Config (package groups) loaded **server-side** via `getCfgFileLoad`; package names and pre/post group scripts inlined
  as env vars (`$env.PACK_ADD_NAMES`, `$env.PACK_ADD_GROUP_NAMES`, etc.). Nushell manager scripts never fetch config via
  HTTP.

**file** (src/cmd/file.ts) - Dotfile synchronization

- Maps config files from server to shell paths based on OS
- Supports permission management (ACLs on Windows, chmod on Unix)
- Operations: diff, find, sync
- **Note:** Only works with nushell shell (falls back to nu from pwsh/zsh)
- `file.yaml` loaded **server-side** via `getCfgFileLoad` (stitch-capable). Path pairs and permissions inlined as env
  var arrays. Actual file content fetched at runtime via `REQ_URL_CFG/file/{path}`.

See [docs/rules.md](docs/rules.md) for `file.yaml` structure, directory support, template substitution, and permission
management.

**script** (src/cmd/script.ts) - Custom script execution

- Executes shell scripts stored in config directories
- Scripts filtered by shell type and OS context via `contextFilter` in `script.yaml`
- Operations: exec, find
- **Note:** For pwsh/zsh shells, SSR mode only (not CSR)
- `script.yaml` loaded **server-side** via `getCfgFileLoad` (stitch-capable). In exec mode, script content is inlined
  directly into the generated script. In find mode, a listing is generated.

See [docs/rules.md](docs/rules.md) for gate types, enforcement requirements, and examples.

**virt** (src/cmd/virt.ts) - Virtual machine / container management

- Manages Docker, Podman, LXC containers, and QEMU VMs
- Operations: add, find, list, rem, sync, tidy
- Managers by platform: linux=[docker, podman, lxc, qemu], darwin=[docker, podman, qemu]

#### virt config hierarchy

Config lives at two levels:

- **Global**: `cfg/virt/{manager}.yaml` — defaults, shared settings, architecture/CPU flags
- **Instance**: `cfg/virt/{host}/{manager}/{instance}.yaml` — per-instance overrides and specifics

**lxc and qemu** use overlay-style config: global sets defaults, instance overrides. Both configs are fetched at runtime
by the nushell script via `REQ_URL_CFG`, then deep merged in nushell (`deepMerge` function). Merge rules: records merge
recursively, lists append (global first, instance appended), scalars: instance wins. This means any field can freely be
moved between global and instance YAML without changing behavior.

**podman** has three layers and is NOT overlay-style:

1. `cfg/virt/podman.yaml` — global network definitions only. Loaded **server-side** via `getCfgFileLoad`, networks
   record inlined as `$env.VIRT_PODMAN_NETWORKS` (JSON). Nushell reads `$env.VIRT_PODMAN_NETWORKS | from json`.
2. `cfg/virt/{host}/podman/{pod}.yaml` — pod-level Kubernetes YAML (kind: Pod) with hostname, network annotation, MAC.
   Also the place to put a `kind: Build` block for shared image builds across instances.
3. `cfg/virt/{host}/podman/{pod}/{instance}.yaml` — instance-level Kubernetes YAML (kind: Pod containers/volumes,
   optional kind: ConfigMap).

Pod and instance YAMLs are standard Kubernetes YAML consumed directly by `podman kube play` / systemd quadlets. The
`kind: Build` custom doc type triggers `podman build` before kube play; it is stripped before passing to podman.
Placeholder substitution (`{host}`, `{pod}`, `{instance}`) is done by the nushell script at runtime.

## Environment Variables

**.env:**

- `CFG_DIRS` - Pipe-separated list of config directories (wut-config|wut-config-secret)

**Shell version numbers** are hardcoded in `src/ver.ts` (not env vars).

**OS platform enum** (`SysOsPlat`) lives in `src/sys.ts` (`darwin`/`linux`/`winnt`). shire passes all sys fields through
as raw strings; shell bootstrap scripts (`shire/src/sh/*/sys.*`) normalize aliases before sending URL params (e.g.
`arm64`→`aarch64`, `genuineintel`→`intel`, `qemu`→`apple`, `kde`→`plasma`).

**Server Runtime:**

- `HOSTNAME` - Server bind address (default: 0.0.0.0)
- `PORT` - Server port (default: 9000)

## Multi-Shell Support

The server primarily generates nushell scripts, with pwsh/zsh shells redirected to the nushell equivalents for commands
with complex logic (pack, file, virt). See file.ts, virt.ts, and pack.ts for redirect implementation.

## Code Formatting

Deno formatting rules (deno.json):

- No semicolons
- Single quotes
- Trailing commas only on multiline
- Always use curly braces for `if` statement bodies, with body on next line

### Import Sorting

Imports must be organized into 3 levels with a single empty line between each level, and sorted alphabetically within
each category:

1. Built-in modules (e.g., `node:*`)
2. External packages (e.g., `@std/*`, `@meop/shire`)
3. Local project files (e.g., `./cmd.ts`, `../sh.ts`)

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

## Filter Semantics

All wut commands use **AND semantics** for filters: every provided term must match for an item to be included. This
means more terms = narrower results, which is the consistent expectation across all commands.

### AND semantics in practice

| Command                      | Behavior                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wut file find foo bar`      | key/alias/path must contain both `foo` AND `bar`                                                                                                                                          |
| `wut file diff/sync foo bar` | key/alias must start with `foo` AND `bar` (both must prefix-match)                                                                                                                        |
| `wut file list foo bar`      | same as diff/sync                                                                                                                                                                         |
| `wut pack find foo bar`      | multi-arg managers pass both terms as args (native AND); single-arg managers loop per term (unavoidable OR — limitation of those tools) |
| `wut pack list/out foo bar`  | chained `\| find foo \| find bar` pipeline = AND                                                                                                                                          |
| `wut pack add/rem foo bar`   | group-based: exact group name lookup; remaining unmatched names passed to manager                                                                                                         |
| `wut virt add foo bar`       | exact path match: `[manager, pod]` must equal filter terms exactly                                                                                                                        |
| `wut virt rem foo bar`       | exact manager name match; instance names passed through as-is to nushell                                                                                                                  |
| `wut virt list foo bar`      | substring manager match; instance names passed through as-is to nushell                                                                                                                   |
| `wut virt sync/tidy`         | `filters.slice(0, 2)` caps at `[manager, pod]` — glob match, treats pod as whole unit                                                                                                     |

### Where AND over OR does not apply

- **Single-arg pack managers on find**: loop per term producing OR behavior. This is
  a tool limitation — some accept multiple args but treat them as OR; others only accept one term.
  Multi-arg managers natively AND multiple args.

### Enumeration patterns

- **virt list/rem**: Always enumerates from the **system** (not config), then AND-filters by VIRT_INSTANCES:
  - docker: `docker compose ls`
  - podman: `/etc/containers/systemd/*.kube`
  - lxc: `lxc-ls`
  - qemu: `/etc/systemd/system/qemu-*.service`
- **file diff/sync/list**: Enumerates from `file.yaml` config (what is managed), not from the filesystem. VIRT_INSTANCES
  / FILE_*_PARTS filters narrow down the config set.

### Pack manager splitting ownership

`pack.ts` always passes the full joined name string (e.g. `"foo bar"`) to the manager via env vars like
`$env.PACK_FIND_NAMES`. Each manager's nushell script owns its own splitting/looping logic:

- Multi-arg managers: `split words` then spread as args (`...$terms`)
- Single-arg managers: `split words` then loop per term
- list/out: `split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten` for chained AND

## Testing

See [docs/tests.md](docs/tests.md) for full details on test architecture, how to update snapshots, and how to add new
test cases.

Some operations require local interactive testing and cannot be fully automated — see README.
