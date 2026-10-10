# Rules

## file.yaml Structure

`file.yaml` defines mapping entries organized by tool/application name. Each entry supports:

**Entry Fields:**

- `maps` - Array of file/directory mappings from config to local filesystem
- `aliases` - Array of alternative names for find operations (e.g., zed: [zeditor, zed-cli])

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

# Aliases for find operations
zed:
  aliases:
    - zeditor
    - zed-cli
  maps:
    - in: settings.json
      out:
        darwin: '{HOME}/.config/zed/settings.json'

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
- Aliases only affect `find` operation filtering

## pack group structure

A group file has two top level keys: `aliases`, other names it answers to, and `operation`, holding `add` and `remove`.
A group states what a manager installs, never which kind of manager it is:

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
      script:
        zsh:
          file: cfg/script/docker/install.zsh
          gate:
            sys_os_plat:
              - linux
```

A manager entry may carry a `gate`, read exactly like a script entry's, for a manager that only applies on some
platforms. `find` honours it too, so a group whose every entry is gated out is not offered there either.

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

File names carry no punctuation — the punctuated spelling is an alias. No blank lines inside the file, one newline at
the end.

`ghpm` is always a user manager and `pacman` is always a system one, so wut derives the tier from the manager and owns
the preference order — user managers, then `script`, then system managers. A yaml that also declared the tier could
declare it wrongly (a system manager filed under `user:` silently never matched), which is why there is one flat
`manager` map. `script` is a key inside that map, not beside it: it is spelled where a manager would be so one loop
walks every install path in file order, so a script is ordered against real managers rather than sitting outside them.

The order of the managers in the file is the group's preference, and the first one present on the machine wins it.
Nothing overrides that: which of the winners actually run is the numbered prompt's answer, not a flag's.

That order is stated once, in `MANAGERS`, and every group yaml is written to match it:

```
ghpm  cargo  deno  bun  pnpm  uv          user space, no sudo
script                                     what a group runs instead of a package
brew  paru  yay  pacman                    darwin, then arch
apk  apt  dnf  xbps  zypper                one distro each
winget  choco  scoop                       windows
```

Four axes decide it, applied in that order:

- **user, then script, then system** — an install that needs no sudo is preferred to one that does, which is what puts
  the portable six ahead of every native manager. What a native installer buys is integration with the platform's own
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

## pack pre and post

`pre` and `post` run around an operation, and they mean the same thing wherever they appear — before and after — at two
levels. `add` and `remove` each take their own, so every slot exists: before and after an install, before and after a
removal.

**Around one manager's call**, beside its names, keyed by shell: commands in the platform's native shell (`pwsh` on
windows, `zsh` elsewhere), so a hook states the shell it is written in rather than a gate:

```yaml
---
operation:
  add:
    manager:
      brew:
        zsh:
          pre:
            - brew tap anomalyco/tap
        names:
          - anomalyco/tap/opencode
  remove:
    manager:
      brew:
        zsh:
          post:
            - brew untap anomalyco/tap
```

`remove` does not repeat `add`'s shape: under a manager it holds only the shell keys, since the package names a removal
passes to the manager come from that manager's `add` entry. A group never states its names twice, so the two halves
cannot drift apart, and a manager with nothing to run around its removal is simply absent from `remove`.

**Around the group**, beside `manager`: scripts, named by their path under `cfg/script` as `tool/action`:

```yaml
---
operation:
  add:
    manager:
      pacman:
        names:
          - docker
    post:
      - docker/setup
  remove:
    pre:
      - docker/teardown
```

Each one runs exactly as `wut s e setup docker` would — the same shell owns it, the same `sys_*` gates apply on the
server, and its `has_cmd` is asked on the client. The script is written once and stays runnable on its own; the group
only says when it is due. One gated off the platform is dropped from the plan while the group still installs.

The two levels hold different things because they answer to different things. A manager's hook belongs to that manager's
call — a tap only means anything to brew — so it is a command, in brew's shell. A group's script follows the group
whichever manager won it: enabling docker's service is the same work whether pacman or a script installed docker, so it
is a script, and runs wherever that script runs.

## pack sync of a standalone install

A tool whose own installer is the group's `script` path usually updates itself too, from wherever that installer put it.
`sync.script` states that place per platform, and what to hand the binary there:

```yaml
---
operation:
  add:
    manager:
      script:
        nu:
          file: cfg/script/deno/install.nu
  sync:
    script:
      path:
        darwin: '{HOME}/.deno/bin/deno'
        linux: '{HOME}/.deno/bin/deno'
        windows: '{HOME}/.deno/bin/deno.exe'
      args:
        - upgrade
```

The path is the whole test of whether that install is here, so it names the file the installer writes, with `{HOME}` and
other env names spelled the way `file.yaml` spells them. A platform with no path has no standalone install to look for.

## pack group aliases

A pack group is named by its path — `cfg/pack/shell/nu.yaml` is `shell-nu` — and `aliases` gives it other names to be
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
the heading (`shell-nu (nushell)`) so the match explains itself.

Aliases are a lookup key only — never an install name. Each manager still gets exactly the `names` it declares, so ghpm
and cargo keep asking for `nu` while pacman asks for `nushell`. That matters wherever the binary, the package and the
group disagree: `rg` vs `ripgrep`, `nu` vs `nushell`.

**Naming:** a group is named for its binary, not its project — `code.yaml` with alias `vscode`, `7z.yaml` with alias
`7zip`, `gpg.yaml` with alias `gnupg`. Aliases are listed sorted, and `find` shows them sorted.

A companion package is not an alias. `npm` ships inside node on brew and winget but is split out on pacman and dnf, so
it belongs in those managers' `names` — same for `docker-compose` alongside `docker`. An alias is another name for the
same thing; a companion is a second thing the group installs.

`find` matches aliases by substring, like it matches group and package names. Resolution for `add`/`remove` matches an
alias exactly, the way a full group name matches, and structural path matches are preferred over alias matches when both
hit.

## script.yaml Gate Enforcement

`script.yaml` defines gate conditions that must be met for scripts to be available/executable. All gates are enforced at
two levels for consistency.

**Gate Types:**

- `has_cmd` - Command(s) the script needs on the client's PATH — any one is enough. Client-side (see below)
- `no_cmd` - Command(s) that must all be absent from the client's PATH — an install's own tool, so it leaves the listing
  once installed. Client-side (see below)
- `has_svc` / `no_svc` - The same for services (`sc.exe query` on windows, a systemd unit file on linux) — how a windows
  feature shows it is installed. Client-side (see below)
- `sys_os_plat` - OS platform (darwin, linux, windows)
- `sys_os` - Specific OS distribution (debian, ubuntu, arch, etc.) — exact match
- `sys_os_like` - OS family substring match (e.g. `debian` matches ubuntu, kali, etc.; `arch` matches manjaro, etc.)
- `sys_os_de` - Desktop environment (gnome, lxde, plasma, etc.)
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

`sys_*` gates are resolved on the server. `has_cmd`, `no_cmd`, `has_svc` and `no_svc` cannot be, and are answered by the
client instead — see [SCRIPT.md](SCRIPT.md#the-clients-gates).

**Examples:**

- `brew/install.zsh` has `sys_os_plat: [darwin]` in YAML and checks `[[ $SYS_OS_PLAT != darwin ]]`
- `brew/setup.zsh` adds `has_cmd: [brew]` in YAML and checks `type brew > /dev/null`
- `deno/install.nu` adds `no_cmd: [deno]` in YAML and checks `which deno | is-not-empty` before it asks
- `hyperv/install.ps1` adds `no_svc: [vmms]` in YAML and checks `Get-Service vmms` before it asks
- `gnome-terminal/setup.zsh` has `sys_os_de: [gnome]` + `sys_os_plat: [linux]` in YAML and checks both
- `node/install.zsh` has `sys_os_like: [debian]` in YAML and checks `[[ $SYS_OS_LIKE != *debian* ]]`
- `docker/install.zsh` has `sys_os: [debian, ubuntu]` in YAML and checks exact `$SYS_OS` (because `$SYS_OS` is also used
  in URL construction)
