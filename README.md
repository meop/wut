# wut

Web Update Tool

This tool is expected to be run locally and interactively

Some operations cannot work over SSH because they are installing GUI tools

Some operations create dynamic prompts for the user and cannot be scripted

## unix

Linux

MacOS

### cli

```zsh
export WUT_URL='http://yard.lan:9000'

alias wut='wut_wrap'

function wut_wrap {
  local url="$(echo "${WUT_URL}" | sed 's:/*$::')"
  local url="${url}/sh/zsh"
  local url="$(echo "${url}" "$@" | sed 's/ /\//g' | sed 's:/*$::')"

  eval "( $(curl --fail-with-body --location --silent --url "${url}") )"
}
```

## winnt

Windows

### cli

```pwsh
$env:WUT_URL = 'http://yard.lan:9000'

Set-Alias wut 'wut_wrap'

function wut_wrap {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/sh/pwsh"
  $url = "${url}/$($args -Join '/')".TrimEnd('/')

  Invoke-Expression (Invoke-WebRequest -Uri "${url}")
}
```
