# Rules

## file.yaml Structure

`file.yaml` defines mapping entries organized by tool/application name. Each entry supports:

**Entry Fields:**

- `maps` - Array of file/directory mappings from config to local filesystem

The key is the entry's only name, and the binary looked for on the client before anything is written.

**Map Properties:**

- `in` - Source path (supports directories and template substitution)
- `out` - Destination mapping object keyed by platform (darwin, linux, windows)
- `permission` - Optional permission settings (Windows ACLs, Unix chmod), per map only — there is no entry level
  `permission`

**Directory Support:** If `in` is a directory, `file.ts` automatically syncs all files within it using `isDirPath()` and
`getFilePaths()`, creating separate sync pairs for each file found.

**Template Substitution:** The `withCtx()` function replaces placeholders in `in` paths at runtime:

- `{SYS_HOST}` — actual hostname
- `{HOME}` — home directory
- Example: `in: '{SYS_HOST}/config.yaml'` → `in: 'metal/config.yaml'` on host `metal`

**Permission Management:** Applied after sync. Windows uses ACL commands via `getPlatAclPermCmds()`; Unix uses chmod.

**Examples:**

```yaml
# Simple file mapping
docker:
  maps:
    - in: config.json
      out:
        darwin: '{HOME}/.docker/config.json'
        linux: '{HOME}/.docker/config.json'

# Directory mapping (syncs all files in directory)
ghostty:
  maps:
    - in: themes
      out:
        darwin: '{HOME}/.config/ghostty/themes'
        linux: '{HOME}/.config/ghostty/themes'

# Template substitution
llama-swap:
  maps:
    - in: '{SYS_HOST}/config.yaml'
      out:
        darwin: '{HOME}/.llama/config.yaml'
        linux: '{HOME}/.llama/config.yaml'

# Permission management
ssh:
  maps:
    - in: config
      out:
        darwin: '{HOME}/.ssh/config'
        linux: '{HOME}/.ssh/config'
      permission:
        user:
          read: true
          write: true
```

**Validation Rules:**

- All `in` paths must exist in `cfg/file/` directory tree
- `out` paths must have appropriate platform keys for target OS
- Directory entries can contain any number of files (no need to list each)
- Template paths (with `{...}`) are resolved at runtime from context
- A key is the entry's name: `diff` and `sync` take it whole, `find` and `list` the start of a word of it, or of an `in`
  path ([COMMANDS.md](COMMANDS.md))

## pack group structure

A group file has three top level keys: `descr`, a sentence about it that `find` searches, `aliases`, other names it
answers to, and `operation`, holding `add`. `descr` and `aliases` are optional. A group states what a manager installs,
never which kind of manager it is:

```yaml
---
descr: A shell that treats everything as structured data.
aliases:
  - nushell
operation:
  add:
    manager:
      ghpm:
        names:
          - nu
      pacman:
        names:
          - nushell
```

A manager entry may carry a `gate`, read exactly like a script's in `script.yaml`, for a manager that only applies on
some platforms. `find` honours it too, so a group whose every entry is gated out is not offered there either.

## a name may carry its own flags

A name is usually just a name, but a manager sometimes needs one qualified. Homebrew packages most things as either a
formula or a cask, never both, and then the flavor is unambiguous — but for the few packaged as both, only `--cask` or
`--formula` says which one is meant:

```yaml
brew:
  names:
    - --cask vivaldi
    - --formula node
    - jq
```

The flags belong to the name they precede, not to the entry. That is what lets one entry hold all three lines above, and
it is why the flags cannot simply be prepended to the whole call: `brew uninstall --cask vivaldi --formula node` is not
something brew accepts. Names are grouped by their flag set instead, in the order the names first introduce each one,
and every group is issued as its own invocation — three names, three calls to brew.

The flags qualify the checks as well, not just the install and uninstall. `--cask vivaldi` asks `brew list --cask`, so a
formula sharing the name cannot answer for the cask, and the reverse. A line that is only a flag names no package and is
ignored.

A file is named the way the tool spells itself, hyphens included (`golangci-lint.yaml`): a group's name joins its levels
with `/`, which no file name can hold, so a hyphen inside a level is never mistaken for the edge of one. No blank lines
inside the file, one newline at the end.

A group's managers are tried in one fixed order, whatever order its yaml lists them, and the first one this machine has
wins. The yaml says which managers can serve the group and by what names; the order is not its to state, so no two
groups can disagree about ghpm against brew. `script` is a key inside the flat `manager` map, not beside it: it is a
project's own installer — the way in its docs call official, with a package manager the fallback — and takes the slot
between the user managers and the system's. So ghpm or cargo serves a group before its script does, and its script
before any system manager; a group whose script is its only way in short of a system package (rustup, dotnetup) simply
names no user manager. A yaml that also declared a tier could declare it wrongly (a system manager filed under `user:`
silently never matched), so there is none.

The first manager present on the machine wins, and nothing overrides that: which of the winners actually run is the
numbered prompt's answer, not a flag's.

That order is stated once, in `GROUP_ORDER` (`MANAGERS` with `script` in its slot), and loose names take `MANAGERS`:

```
ghpm  pnpm  deno  bun  uv                  user space, no sudo: release binaries, js, scripting
dotnet  go  cargo                          user space, no sudo: the compiled stacks, nearest the system last
script                                     what a group runs instead of a package
brew  paru  yay  pacman                    darwin, then arch
apk  apt  dnf  emerge  xbps  zypper        one distro each
nix                                        nixos, or beside a distro's own
winget  choco  scoop                       windows
```

Four axes decide it, applied in that order:

- **user, then script, then system** — an install that needs no sudo is preferred to one that does, which is what puts
  the portable managers ahead of every native one. What a native installer buys is integration with the platform's own
  UI, and a cli tool has none to collect: on darwin native means the app store, and on a non-rolling linux it means
  trailing upstream on patches. A gui app would weigh windows the other way — an entry in Add/Remove Programs and the
  Start menu is worth reaching for — but that is not what these groups hold
- **shipped before opt-in** — inside the windows three the privilege axis decides nothing, since none of them needs sudo
  for a user-scope install. What the OS ships does: `winget` is on every windows machine and is the one wired into its
  package UI, while `choco` and `scoop` are themselves installs someone has to have made first
- **darwin, then linux, then windows** — a machine only has one of these, so this is about reading order, not contest
- **superset before base** — `paru` and `yay` wrap `pacman` and can install everything it can plus the AUR, so reaching
  for the narrower one first would install less than asked

Alphabetical is not one of them. Sorting the list reads as an order without being one, and it put `choco` ahead of
`winget` and `bun` ahead of `ghpm` for no reason anyone stated.

`paru`, `yay` and `pacman` are one manager as far as a machine is concerned, so the client collapses them to whichever
of the three is here, in that order — see [PACK.md](PACK.md#the-pacman-family-is-one-manager). Declare the narrowest one
that can serve the group: `pacman` for a repo package, `yay` for an AUR one.

## a pack group's own scripts

A group's scripts are never named in its yaml. They are the scripts in the `cfg/script` directory of the group's own
name, the last level of its path: `lang/goup.yaml` owns `cfg/script/goup/`, `editor/code.yaml` owns `cfg/script/code/`.
An alias is a name to type and reaches no script, so a group and its scripts are named alike: the group is named for
what it installs, and its script directory takes the same name.

Each op runs the actions it owns, when `script.yaml` gates them in:

| op       | before     | its own path, beside the managers             | after   |
| -------- | ---------- | --------------------------------------------- | ------- |
| `add`    | `repo`     | `add`: the tool's own installer               | `setup` |
| `remove` | `teardown` | `remove`: its uninstaller                     |         |
| `sync`   |            | `sync`: after the managers, whenever gated in |         |
| `tidy`   |            | `tidy`: after the managers, whenever gated in |         |

The `add` and `remove` scripts are an install path like a manager, placed by `GROUP_ORDER` between the user managers and
the system's: the script runs where no user manager the group names is here. A `sync` script is what keeps the tool
current: updating a standalone install, gated with `has_path` on the file its installer puts down, or putting back what
an update undid, gated with `has_cmd` on the tool. A named sync offers it as one more path, after every manager's; a
bare sync and a bare tidy offer every group's own `sync` or `tidy` script as the `script` row
([PACK.md](PACK.md#a-groups-own-scripts)).

Each runs exactly as `wut s e <action> <tool>` would — the same shell owns it, the same `sys_*` gates apply on the
server, and its client gates are asked on the client. The script is written once and stays runnable on its own; the
group's name is what says when it is due. One gated off the platform is dropped from the plan while the group still
installs.

A manager's own prerequisites are the manager's: a brew tap is part of the name brew is given (`anomalyco/tap/opencode`,
which brew taps itself), a scoop bucket the same (`games/xemu`, whose bucket scoop.nu adds first), and on the centos
family dnf enables epel and crb before an add, since that is where a group's rpm names are there.

## Managed tool updates

Wut manages updates for the tools its configuration covers. Disable each tool's automatic self-updater and update
notifications where it supports doing so. Apply the same settings to portable, ghpm and system-package installations;
the update preference does not need installation-source detection or an unset-only default. Use a setup script to merge
managed keys into settings the tool also writes, or file sync for a file the repo owns entirely.

Explicit `wut pack sync` still updates tools through their owning managers or their own `sync` scripts. Keep that path
distinction: a self-update command must not overwrite a binary ghpm or a system manager owns. Disabling background
updates and notices does not mean removing the explicit sync operation. If a tool's setting also prevents an explicit
update, report that refusal rather than temporarily enabling its updater.

This rule concerns the managed tool replacing itself or advertising its own updates. Toolchains, dependencies, plugins,
models, games and container images it manages are separate configuration decisions.

## pack group aliases

A pack group is named by its path — `cfg/pack/shell/nu.yaml` is `shell/nu` — and `aliases` gives it other names to be
found by:

```yaml
---
aliases:
  - nushell
operation:
  add:
    manager:
      ghpm:
        names:
          - nu
      pacman:
        names:
          - nushell
```

`wut p f nushell`, `wut p add nushell` and `wut p rem nushell` now all reach this group, and `find` shows the alias in
the heading (`shell/nu (nushell)`) so the match explains itself.

Aliases are a lookup key only — never an install name. Each manager still gets exactly the `names` it declares, so ghpm
and cargo keep asking for `nu` while pacman asks for `nushell`. That matters wherever the binary, the package and the
group disagree: `rg` vs `ripgrep`, `nu` vs `nushell`.

**Naming:** a group is named for its binary, not its project — `code.yaml` with alias `vscode`, `7z.yaml` with alias
`7zip`, `gpg.yaml` with alias `gnupg`. Aliases are listed sorted, and `find` shows them sorted.

A companion package is not an alias. `npm` ships inside node on brew and winget but is split out on pacman and dnf, so
it belongs in those managers' `names` — same for `docker-compose` alongside `docker`. An alias is another name for the
same thing; a companion is a second thing the group installs.

An alias is a whole name, matched the way the group's own name is ([COMMANDS.md](COMMANDS.md)): `add`, `remove`, `sync`
and `info` take it exactly, so `nush` is not `nushell`, and a shorter spelling worth having is another alias. Two
spellings of one name are two aliases too (`lm-studio` beside a group named `lmstudio`) — nothing is normalised, and an
alias is there because the tool is commonly called that, not to help a search along. `find` reads further: the start of
any word of the name, an alias, a declared package, or `descr`.

An alias stands in for the group's own name, so it reaches the folder of the same name too: an alias of `x.yaml` brings
everything under `x/` along, as `x` itself does. A folder beside a file of its name is how groups combine:
`lang/goup.yaml` is the toolchain and `lang/goup/golangci-lint.yaml` the linter, so `wut p a go`, an alias of goup,
installs both, each its own row to pick or leave.

## pack group descr

`descr` is one sentence about the group. Nothing acts on it; `find` searches it, for the case where what is remembered
is what the thing does rather than what it is called.

## script.yaml Gate Enforcement

`script.yaml` defines gate conditions that must be met for scripts to be available/executable. All gates are enforced at
two levels for consistency.

**Gate Types:**

- `has_cmd` - Command(s) the script needs on the client's PATH — any one is enough. Client-side (see below)
- `no_cmd` - Command(s) that must all be absent from the client's PATH — an install's own tool, so it leaves the listing
  once installed. Client-side (see below)
- `has_svc` / `no_svc` - The same for services (`sc.exe query` on windows, a systemd unit file on linux) — how a windows
  feature shows it is installed. Client-side (see below)
- `has_path` - Path(s) the script needs on the client — any one is enough, and `~` is the home dir. How a macos app
  shows it is installed, or a tool that leaves a directory and no command. Client-side (see below)
- `sys_os_plat` - OS platform (darwin, linux, windows)
- `sys_os` - Specific OS distribution (debian, ubuntu, arch, etc.) — exact match
- `sys_os_like` - OS family substring match (e.g. `debian` matches ubuntu, kali, etc.; `arch` matches manjaro, etc.)
- `sys_os_de` - Desktop environment (gnome, lxde, plasma, etc.). It never hides a script, since another desktop can be
  installed and a session can be without one: the listing says which it is (see below)
- `no_ssh` - `true` for a script whose tool refuses an ssh session (`utmctl`). Client-side (see below)
- `sys_cpu_arch` - CPU architecture (x86_64, aarch64, etc.)

**Enforcement Requirements:**

1. **script.yaml** — each script must have gates matching its actual compatibility
2. **Shell scripts** — each script must include corresponding OS/DE checks at function start:
   - pwsh:
     ```powershell
     if (-not $IsWindows) {
       Write-Host 'script is for windows'
       return
     }
     ```
   - zsh:
     ```zsh
     if [[ $SYS_OS_PLAT != linux ]]; then
       echo 'script is for linux'
       return
     fi
     ```

Gates must match in both places — scripts are both discovered only on appropriate systems (YAML) and protected against
accidental execution on incompatible ones (script body).

`sys_*` gates are resolved on the server. `has_cmd`, `no_cmd`, `has_svc`, `no_svc`, `has_path` and `no_ssh` cannot be,
and are answered by the client instead — see [SCRIPT.md](SCRIPT.md#the-clients-gates).

**Examples:**

- `brew/install.zsh` has `sys_os_plat: [darwin]` in YAML and checks `[[ $SYS_OS_PLAT != darwin ]]`
- `podman/setup.zsh` adds `has_cmd: [podman]` in YAML and checks `type podman > /dev/null`
- `deno/install.nu` adds `no_cmd: [deno]` in YAML and checks `which deno | is-not-empty` before it asks
- `hyperv/install.ps1` adds `no_svc: [vmms]` in YAML and checks `Get-Service vmms` before it asks
- `rectangle/setup.zsh` adds `has_path: [/Applications/Rectangle.app]` in YAML and checks `[[ ! -d ... ]]`
- `gnome-terminal/setup.zsh` has `sys_os_de: [gnome]` + `sys_os_plat: [linux]` in YAML and checks both
- `utmctl/sync.zsh` adds `no_ssh: true` in YAML and checks `[[ $SSH_CONNECTION ]]`
- `node/install.zsh` has `sys_os_like: [debian]` in YAML and checks `[[ $SYS_OS_LIKE != *debian* ]]`
- `docker/repo.zsh` has `sys_os: [debian, fedora, ubuntu]` in YAML and checks exact `$SYS_OS` (because `$SYS_OS` is also
  used in URL construction)
