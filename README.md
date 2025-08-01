# wut

Web Update Tool

This tool is expected to be run locally and interactively

Some operations cannot work over SSH because they are installing GUI tools

Some operations create dynamic prompts for the user and cannot be scripted

## nu

Nushell is supported on Unix or Windows for SSR commands (pack, script)

Nushell is supported on Unix or Windows for CSR commands (file, virt)

```nu
$env.WUT_URL = 'http://yard.lan:9000'

def wut --wrapped [...args] {
  mut url = $"($env.WUT_URL)" | str trim --right --char '/'
  mut url = $"($url)/cli/nu"
  mut url = $"($url)/($args | str join '/')" | str trim --right --char '/'

  nu --no-config-file -c $"( http get --raw --redirect-mode follow $"($url)" )"
}
```

## pwsh

Powershell is supported on Windows for SSR commands (pack, script)

Nushell will be invoked for CSR commands (file, virt)

```pwsh
$env:WUT_URL = 'http://yard.lan:9000'

function wut {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/cli/pwsh"
  $url = "${url}/$($args -Join '/')".TrimEnd('/')

  pwsh -noprofile -c "$( Invoke-WebRequest -ErrorAction Stop -ProgressAction SilentlyContinue -Uri "${url}" )"
}
```

## zsh

Zshell is supported on Unix for SSR commands (pack, script)

Nushell will be invoked for CSR commands (file, virt)

```zsh
export WUT_URL='http://yard.lan:9000'

function wut {
  local url=$(echo "${WUT_URL}" | sed 's:/*$::')
  local url=$(echo "${url}/cli/zsh")
  local url=$(echo "${url}/$(echo "$*" | sed 's/ /\//g')" | sed 's:/*$::')

  zsh --no-rcs -c "$( curl --fail-with-body --location --no-progress-meter --url "${url}" )"
}
```
