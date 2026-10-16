# wut

Web Update Tool — a server that dynamically generates and serves shell scripts to client shells over HTTP.

This tool is expected to be run locally and interactively.

Some operations cannot work over SSH because they install GUI tools.

Some operations create dynamic prompts for the user and cannot be scripted.

## prerequisites

- **wut-config** — config repository cloned as a sibling directory (`../wut-config`)
- **Deno** — to run the server

## server

Start the server (requires Deno):

```bash
deno task start
```

Or via systemd:

```bash
deno task start:systemd

# Stop when done
deno task stop:systemd
```

The server runs on port 9000 by default. Set `PORT` to override.

## shell client

Set `WUT_URL` to your server address, then paste the corresponding `wut` function into your shell config. The zsh client
needs curl 8.3 or newer, for `--variable`.

### nu

```nu
$env.WUT_URL = 'http://my-server:9000'

def wut --wrapped [...args] {
  mut url = $"($env.WUT_URL)" | str trim --right --char '/'
  mut url = $"($url)/sh/nu"
  mut url = $"($url)/($args | each { url encode --all } | str join '/')" | str trim --right --char '/'

  nu --no-config-file -c $"( http get --raw --redirect-mode follow $url )"
}
```

### pwsh

```pwsh
$env:WUT_URL = 'http://my-server:9000'

function wut {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/sh/pwsh"
  $url = "${url}/$(($args | ForEach-Object { [uri]::EscapeDataString("$_") }) -join '/')".TrimEnd('/')

  pwsh -noprofile -c "$( Invoke-RestMethod -ErrorAction Stop -ProgressAction SilentlyContinue -Uri $url )"
}
```

### zsh

```zsh
export WUT_URL='http://my-server:9000'

function wut {
  local url=$(echo "${WUT_URL}" | sed 's:/*$::')
  local url=$(echo "${url}/sh/zsh")
  local arg vars=() i=0
  for arg; do vars+=(--variable "a$((++i))=${arg}"); url+="/{{a${i}:url}}"; done

  zsh --no-rcs -c "$( curl --fail-with-body --location --no-progress-meter "${vars[@]}" --expand-url $url )"
}
```

## commands

| Command  | Aliases | Description                                           | Ops                                                                 |
| -------- | ------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `pack`   | `p`     | Package manager operations                            | `add`, `find`, `info`, `list`, `outdated`, `remove`, `sync`, `tidy` |
| `file`   | `f`     | Dotfile sync from server to local paths               | `diff`, `find`, `list`, `sync`                                      |
| `script` | `s`     | Run shell scripts stored in config                    | `exec`, `find`                                                      |
| `virt`   | `v`     | Container / VM management (docker, podman, lxc, qemu) | `add`, `find`, `list`, `off`, `on`, `rem`, `run`, `sync`, `tidy`    |

Names are matched the same way in every command. An op that acts (`add`, `remove`, `sync`, `run`, `exec`, `diff`,
`info`) takes a name whole — a group, a folder above it, an instance, or an alias — so `wut p a nush` is not `nushell`.
An op that reads (`find`, `list`, `outdated`) takes the start of a word, so `wut p f tight` finds the group holding
`glavsoft.tightvnc`, and never the middle of one. Look with `find`, then act with the name it shows. See
[docs/COMMANDS.md](docs/COMMANDS.md).
