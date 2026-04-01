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

## script.yaml Gate Enforcement

`script.yaml` defines gate conditions that must be met for scripts to be available/executable. All gates are enforced at
two levels for consistency.

**Gate Types:**

- `sys_os_plat` - OS platform (darwin, linux, winnt)
- `sys_os` - Specific OS distribution (debian, ubuntu, arch, etc.) — exact match
- `sys_os_like` - OS family substring match (e.g. `debian` matches ubuntu, kali, etc.; `arch` matches manjaro, etc.)
- `sys_os_de` - Desktop environment (gnome, lxde, plasma, etc.)
- `sys_cpu_arch` - CPU architecture (x86_64, aarch64, etc.)

**Enforcement Requirements:**

1. **script.yaml** — each script must have gates matching its actual compatibility
2. **Shell scripts** — each script must include corresponding OS/DE checks at function start:
   - pwsh: `if (-not $IsWindows) { Write-Host 'script is for winnt'; return }`
   - zsh: `if [[ $SYS_OS_PLAT != 'linux' ]]; then echo 'script is for linux'; return; fi`

Gates must match in both places — scripts are both discovered only on appropriate systems (YAML) and protected against
accidental execution on incompatible ones (script body).

**Examples:**

- `install/brew.zsh` has `sys_os_plat: [darwin]` in YAML and checks `[[ $SYS_OS_PLAT != 'darwin' ]]`
- `setup/gnome-terminal.zsh` has `sys_os_de: [gnome]` + `sys_os_plat: [linux]` in YAML and checks both
- `install/node.zsh` has `sys_os_like: [debian]` in YAML and checks `[[ $SYS_OS_LIKE != *'debian'* ]]`
- `install/docker.zsh` has `sys_os: [debian, ubuntu]` in YAML and checks exact `$SYS_OS` (because `$SYS_OS` is also used
  in URL construction)
