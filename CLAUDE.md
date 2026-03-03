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
# Development mode with hot reload
deno task dev

# Start Docker container
deno task docker:dev

# Stop Docker container
deno task docker:dev:down

# Run tests (snapshot + syntax)
deno task test

# Regenerate snapshots after intentional changes
deno task test:update
```

The server runs on port 9000 by default (configurable via PORT env var).

## Architecture Overview

### Server-Side Rendered Shell Scripts

The core concept is that shell scripts are **dynamically generated** on the server and delivered to clients via HTTP.
Clients execute these scripts locally using their shell (nushell/powershell/zsh).

**Request Flow:**

1. Client makes HTTP GET request to server (e.g., `http://yard.lan:9000/cli/nu/pack/add/firefox`)
2. Server parses URL path to determine: client type (nu/pwsh/zsh), command (pack), operation (add), arguments (firefox)
3. Server builds a shell script by:
   - Loading shell-specific template files from `src/cli/{nu,pwsh,zsh}/`
   - Setting variables based on context (OS, user, etc.)
   - Loading config from wut-config/wut-config-secret directories
   - Generating client-specific code
4. Server returns complete shell script as HTTP response
5. Client executes the script

**Client Bootstrap Pattern:**

Clients define a function that fetches and executes server-rendered scripts:

```nu
# Nushell example
def wut --wrapped [...args] {
  nu --no-config-file -c $"( http get --raw --redirect-mode follow $"($env.WUT_URL)/cli/nu/($args | str join '/')" )"
}
```

### Command System

Commands are hierarchical (provided by shire library) with support for:

- Subcommands (e.g., `wut pack add firefox`)
- Aliases (e.g., `p` for `pack`, `a` for `add`)
- Options (e.g., `--manager yay`)
- Switches (e.g., `-g` for group mode)
- Arguments (e.g., package names)

The `CmdBase` class (from shire) handles argument parsing and dispatches to the appropriate `work()` method.

### Client Abstraction

The `Cli` interface (from shire) abstracts shell-specific differences:

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

Files are loaded from `../wut-config/cfg/` and `../wut-config-secret/cfg/` relative to wut directory. Later directories
override earlier ones via deep merge.

Configuration files can be:

- YAML files (`.yaml`) for structured data (package definitions, file mappings)
- Shell scripts (`.nu`, `.ps1`, `.zsh`) for executable code

### Main Commands

**pack** (src/cmd/pack.ts) - Package manager operations

- Detects OS and selects appropriate package manager (yay, pacman, apt, brew, choco, etc.)
- Supports group-based installs (packages defined in YAML config files)
- Operations: add, find, list, out, rem (remove), sync, tidy

**file** (src/cmd/file.ts) - Dotfile synchronization

- Maps config files from server to client paths based on OS
- Supports permission management (ACLs on Windows, chmod on Unix)
- Operations: diff, find, sync
- **Note:** Only works with nushell client (falls back to nu from pwsh/zsh)

**script** (src/cmd/script.ts) - Custom script execution

- Executes shell scripts stored in config directories
- Scripts filtered by client type and OS context
- Operations: exec, find
- **Note:** For pwsh/zsh clients, SSR mode only (not CSR)

**virt** (src/cmd/virt.ts) - Virtual machine management

- Manages Docker containers and QEMU VMs
- Operations: add, find, list, rem, sync, tidy

## Environment Variables

**.env:**

- `CFG_DIRS` - Pipe-separated list of config directories (wut-config|wut-config-secret)

**Shell version numbers** are hardcoded in `src/ver.ts` (not env vars).

**OS platform enum** (`SysOsPlat`) lives in `src/sys.ts` (`darwin`/`linux`/`winnt`). shire passes all sys fields through
as raw strings; client bootstrap scripts (`shire/src/cli/*/sys.*`) normalize aliases before sending URL params (e.g.
`arm64`→`aarch64`, `genuineintel`→`intel`, `qemu`→`apple`, `kde`→`plasma`).

**Server Runtime:**

- `HOSTNAME` - Server bind address (default: 0.0.0.0)
- `PORT` - Server port (default: 9000)
- `WUT_URL` - Client-side variable pointing to server URL

## Client vs Server Architecture

**Server-Side Rendering (SSR):**

- Server generates complete shell script
- Used for: pack commands, script commands
- Works with all shells (nu/pwsh/zsh)

**Client-Side Rendering (CSR):**

- Server generates script that fetches additional data
- Used for: file commands, virt commands
- Only works with nushell (pwsh/zsh redirect to nu)

The distinction is important: some commands intentionally redirect non-nu clients to nu for CSR operations (see
src/cmd/file.ts:57-63).

## Code Formatting

Deno formatting rules (deno.json):

- No semicolons
- Single quotes
- Trailing commas only on multiline

## Testing

Automated tests live in `tests/` and use two tiers:

- **Tier 1 (snapshot)**: Calls `runSrv()` directly with synthetic requests; snapshots the generated script body. Fast,
  no Docker, no shells needed. Snapshots are committed and show diffs in PRs.
- **Tier 2 (syntax)**: Pipes each generated body through the shell's parser (`nu --ide-check`, `zsh -n`,
  `pwsh -Command ParseInput`). Skips gracefully if the shell binary is not found.

```bash
deno task test          # run all tests
deno task test:update   # regenerate snapshots after intentional changes
```

The tool is also designed for **local interactive use** — some operations cannot be fully automated:

- Cannot work over SSH (GUI tool installation)
- Create dynamic prompts for users

Test interactive changes using the dev server and actual shell clients.
