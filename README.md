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
#!/usr/bin/env zsh

export WUT_URL='http://yard.lan:9000'

alias wut='wut_wrap'
function wut_wrap {
  (
    url=$(echo "${WUT_URL}" | sed 's:/*$::')
    url="${url}/zsh"
    url=$(echo "${url}" "$@" | sed 's/ /\//g' | sed 's:/*$::')
    source <( curl --fail --location --show-error --silent --url "${url}" )
  )
}
```

## winnt

Windows

### cli

```pwsh
#requires -PSEdition Core

${env:WUT_URL} = 'http://yard.lan:9000'

Set-Alias -Name wut -Value 'wut_wrap'
function wut_wrap {
  pwsh -nologo -noprofile -command {
    $url = "${env:WUT_URL}".TrimEnd('/')
    $url = "${url}/pwsh"
    $url += "/$($args -Join '/')".TrimEnd('/')
    Invoke-RestMethod -Uri "${url}" | Invoke-Expression
  } -args $args
}
```
