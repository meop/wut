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

Set `WUT_URL` to your server address, then paste the corresponding `wut` function into your shell config.

### nu

```nu
$env.WUT_URL = 'http://my-server:9000'

def wut --wrapped [...args] {
  mut url = $"($env.WUT_URL)" | str trim --right --char '/'
  mut url = $"($url)/sh/nu"
  # one path segment per argument: a name with a slash of its own (@std/path) is encoded so it stays one
  let segments = ($args | each { |a| $a | str replace --all '%' '%25' | str replace --all '/' '%2F' | str replace --all '?' '%3F' | str replace --all '#' '%23' })
  mut url = $"($url)/($segments | str join '/')" | str trim --right --char '/'

  nu --no-config-file -c $"( http get --raw --redirect-mode follow $url )"
}
```

### pwsh

```pwsh
$env:WUT_URL = 'http://my-server:9000'

function wut {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/sh/pwsh"
  # one path segment per argument: a name with a slash of its own (@std/path) is encoded so it stays one
  $segments = $args | ForEach-Object { "$_".Replace('%', '%25').Replace('/', '%2F').Replace('?', '%3F').Replace('#', '%23') }
  $url = "${url}/$($segments -join '/')".TrimEnd('/')

  pwsh -noprofile -c "$( Invoke-RestMethod -ErrorAction Stop -ProgressAction SilentlyContinue -Uri $url )"
}
```

### zsh

```zsh
export WUT_URL='http://my-server:9000'

function wut {
  local url=$(echo "${WUT_URL}" | sed 's:/*$::')
  local url=$(echo "${url}/sh/zsh")
  # one path segment per argument: a name with a slash of its own (@std/path) is encoded so it stays one
  local arg
  local -a segments
  for arg in "$@"; do
    arg=${arg//\%/%25}
    arg=${arg//\//%2F}
    arg=${arg//\?/%3F}
    arg=${arg//\#/%23}
    segments+=("${arg}")
  done
  local url=$(echo "${url}/${(j:/:)segments}" | sed 's:/*$::')

  zsh --no-rcs -c "$( curl --fail-with-body --location --no-progress-meter --url $url )"
}
```

## commands

| Command  | Aliases | Description                                                   |
| -------- | ------- | ------------------------------------------------------------- |
| `pack`   | `p`     | Package manager operations (add, find, list, rem, sync, tidy) |
| `file`   | `f`     | Dotfile sync from server to local paths                       |
| `script` | `s`     | Run shell scripts stored in config                            |
| `virt`   | `v`     | Container / VM management (docker, podman, lxc, qemu)         |
