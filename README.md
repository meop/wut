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
  local url=$(echo "${WUT_URL}" | sed 's:/*$::')
  local url="${url}/zsh"
  local url=$(echo "${url}" "$@" | sed 's/ /\//g' | sed 's:/*$::')

  eval "$( curl --fail --location --show-error --silent --url "${url}" )"
}
```

## winnt

Windows

### cli

```pwsh
${env:WUT_URL} = 'http://yard.lan:9000'

Set-Alias -Name wut -Value 'wut_wrap'

function wut_wrap {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/pwsh"
  $url += "/$($args -Join '/')".TrimEnd('/')

  Invoke-Expression (&{ Invoke-RestMethod -Uri "${url}" })
}
```
