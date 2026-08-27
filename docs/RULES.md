# Rules

## file.yaml Structure

`file.yaml` defines mapping entries organized by tool/application name. Each entry supports:

**Entry Fields:**

- `maps` - Array of file/directory mappings from config to local filesystem
- `aliases` - Array of alternative names for find operations (e.g., zed: [zeditor, zed-cli])

**Map Properties:**

- `in` - Source path (supports directories and template substitution)
- `out` - Destination mapping object keyed by platform (darwin, linux, winnt)
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

File names carry no punctuation — the punctuated spelling is an alias. No blank lines inside the file, one newline at
the end.

`ghpm` is always a user manager and `pacman` is always a system one, so wut derives the tier from the manager and owns
the preference order — user managers, then `script`, then system managers. A yaml that also declared the tier could
declare it wrongly (a system manager filed under `user:` silently never matched), which is why there is one flat
`manager` map. `script` is a key inside that map, not beside it: it is spelled where a manager would be so one loop
walks every install path in file order, and it is what makes `-m ghpm,script` orderable against real managers.

The order of the managers in the file is the group's preference, and the first one present on the machine wins it. `-m`
overrides that for one invocation and takes a list: `wut p -m pacman,ghpm add nu` narrows to those two and prefers
pacman, whatever wut's own order says. `script` is spellable in that list, so naming managers excludes scripts by
default — `-m ghpm,pacman` — while `-m script` runs only the script and `-m ghpm,script` prefers ghpm and falls to the
script.

## pack manager hooks and remove

A manager entry may also carry a shell key — `pwsh` or `zsh` — holding `commands` that run around the manager call. Only
the platform's native shell is read (`pwsh` on winnt, `zsh` elsewhere), so a hook states the shell it is written in
rather than a gate:

```yaml
---
operation:
  add:
    manager:
      brew:
        zsh:
          commands:
            - brew tap anomalyco/tap
        names:
          - opencode
  remove:
    manager:
      brew:
        zsh:
          commands:
            - brew untap anomalyco/tap
```

`add` runs its hook **before** the manager call, `remove` runs its hook **after** — tap then install, uninstall then
untap.

`remove` therefore does not repeat `add`'s shape: it is a post-hook map only, keyed by manager and then by shell. The
package names a removal passes to the manager come from that manager's `add` entry, so a group never states its names
twice and the two halves cannot drift apart. A manager with nothing to undo is simply absent from `remove`, and a group
that needs no hooks at all has no `remove` key.

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

## virt instance layout

An instance is named by its path under the host: `cfg/virt/<sys_host>/<manager>/<instance>.yaml`. The manager is part of
that path everywhere — `find`, `add`, `list`, `rem` all filter on it — and `sys_host` is why one config repo serves
every machine without a gate.

`podman` is the exception, and takes one more level. `<pod>.yaml` is the pod itself — `metadata.name`, the
`io.podman.kube.network` and mac annotations, `spec.hostname`, and nothing else — while `<pod>/<instance>.yaml` files
each contribute containers and volumes that are merged onto it (`podman.nu`, layers 2 and 3). A pod yaml carrying
containers of its own would still work, but it hides the pod's identity in with one instance's payload, so keep it a
shell. This is also why a pod alone is not actionable: `add` and `rem` skip a podman path with no instance part.

`qemu` takes a deeper level with the opposite meaning. `<instance>/<variant>.yaml` is another _way to configure_ an
instance, not another instance — `glass/vga.yaml` and `glass/vfio.yaml` are the emulated-gpu and passthrough spellings
of `glass`. `virtDeepMerge` appends lists, so a variant adds to its base's `qemu.arguments` rather than replacing them:
whatever a variant may set, the base must leave out. `-display` belongs in the variants for that reason.

`run` and `add` both reach a variant, but only when a filter names it — `wut v run glass vfio`, `wut v add glass vfio`.
`wut v add glass` is glass itself and never fans out over its variants, and `add` resolves the variant back to the base
for the service name, so the unit stays `qemu-glass.service` either way. `rem`, `sync` and `tidy` act on that installed
unit and so stop at the instance, and `find` lists the instance once however many variants it has.

`run` is qemu's alone — the other managers have no foreground mode, so naming one is refused rather than planned.

`docker` instances are plain compose files, served whole to `docker compose --file -`. `docker.nu` reads
`services.*.volumes` to pre-create bind sources, in both the `source: … target: …` and `host:container` spellings, so
those paths are written out in full — nothing substitutes `{host}` in a compose file.

## podman image builds

A pod yaml may open with a `kind: Build` doc naming images to build before the pod starts:

```yaml
---
kind: Build
images:
  - name: localhost/app:latest
    filePath: '/virt/{host}/podman/{pod}/Dockerfile.app'
    buildContextPath: '/srv/virt/podman/{host}/{pod}'
---
kind: Pod
metadata:
  name: '{pod}'
```

`filePath` is a `/cfg` route path, not a local one: the client fetches the Containerfile over HTTP, writes it into
`buildContextPath`, and builds. An instance then names the built image like any other — `image: localhost/app:latest`.

`Build` is wut's own kind and is stripped before anything reaches podman (`processYaml`). `{host}`, `{pod}` and
`{instance}` are substituted in both docs. An image already built in this run is not built again, so several instances
may share one.

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
