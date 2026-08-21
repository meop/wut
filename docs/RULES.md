# Rules

## file.yaml Structure

`file.yaml` defines mapping entries organized by tool/application name. Each entry supports:

**Entry Fields:**

- `maps` - Array of file/directory mappings from config to local filesystem
- `aliases` - Array of alternative names for find operations (e.g., zed: [zeditor, zed-cli])
- `permission` - Optional permission settings for files (Windows ACLs, Unix chmod)

**Map Properties:**

- `in` - Source path (supports directories and template substitution)
- `out` - Destination mapping object keyed by platform (darwin, linux, winnt)
- `permission` - Optional per-file permission settings

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

File names carry no punctuation — the punctuated spelling is an alias. No blank lines inside the file, one newline at
the end.

`ghpm` is always a user manager and `pacman` is always a system one, so wut derives the tier from the manager and owns
the preference order — user managers, then `script`, then system managers. A yaml that also declared the tier could
declare it wrongly (a system manager filed under `user:` silently never matched), which is why there is one flat
`manager` map. `script` is a sibling because it is not a manager. `remove` takes the same shape.

`-m` overrides the order for one invocation and takes a list: `wut p -m pacman,ghpm add nu` narrows to those two and
prefers pacman, whatever wut's own order says. `script` is spellable in that list, so naming managers excludes scripts
by default — `-m ghpm,pacman` — while `-m script` runs only the script and `-m ghpm,script` prefers ghpm and falls to
the script.

## pack group aliases

A pack group is named by its path — `cfg/pack/shell/nu.yaml` is `shell-nu` — and `aliases` gives it other names to be
found by:

```yaml
---
aliases:
  - nushell
add:
  user:
    ghpm:
      names:
        - nu
  system:
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
- `sys_os_plat` - OS platform (darwin, linux, winnt)
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
       Write-Host 'script is for winnt'
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

**Client-side gates:**

`sys_*` gates are resolved on the server, from context the client sent. `has_cmd` cannot be — the server does not know
what is on the client's PATH — so it compiles into the emitted script instead, via `scriptHasCmd` from
`src/sh/<shell>/script.<ext>`:

- `script find` hands the whole listing to the client (`scriptFindGroup`), which drops tools whose command is missing,
  and drops the action heading entirely when nothing under it survives
- `script exec` with an action alone wraps each block in the gate, so a fanned out run silently skips what the client
  cannot use — the same shape as a `pack` manager function returning early
- `script exec` with a tool named does **not** wrap it: the run was asked for by name, so the script's own check gets to
  say `'<tool> is not installed'`

Declare `has_cmd` only where the tool must already exist — `install` actions must stay ungated, or they would skip
exactly when they are needed. A script that gates on something other than a command (an app bundle, a config file) keeps
that check in its body only.

**Examples:**

- `brew/install.zsh` has `sys_os_plat: [darwin]` in YAML and checks `[[ $SYS_OS_PLAT != darwin ]]`
- `brew/repair.zsh` adds `has_cmd: [brew]` in YAML and checks `type brew > /dev/null`
- `gnome-terminal/setup.zsh` has `sys_os_de: [gnome]` + `sys_os_plat: [linux]` in YAML and checks both
- `node/install.zsh` has `sys_os_like: [debian]` in YAML and checks `[[ $SYS_OS_LIKE != *debian* ]]`
- `docker/install.zsh` has `sys_os: [debian, ubuntu]` in YAML and checks exact `$SYS_OS` (because `$SYS_OS` is also used
  in URL construction)
