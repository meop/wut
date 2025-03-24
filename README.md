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

verMajor=5
verMinor=9

autoload is-at-least
if ! is-at-least "${verMajor}.${verMinor}"; then
  echo "zsh must be >= '${verMajor}.${verMinor}' .. found '${ZSH_VERSION}' .. aborting" >&2
  exit 1
fi

export WUT_URL='http://yard.lan:9000'

alias wut='wut_wrap'

function wut_wrap {
  (
    WUT_URL=$(echo "${WUT_URL}" | sed 's:/*$::')
    WUT_URL=$(echo "${WUT_URL}" "$@" | sed 's/ /\//g' | sed 's:/*$::')
    WUT_URL="${WUT_URL}/?sysSh=zsh"

    curl --fail --location --show-error --silent --url "${WUT_URL}" | zsh
  )
}
```

## winnt

Windows

### cli

```pwsh
#requires -PSEdition Core

$verMajor = 7
$verMinor = 5

if ($PSVersionTable.PSVersion.Major -lt ${verMajor} ||
    $PSVersionTable.PSVersion.Minor -lt ${verMinor}) {
  Write-Error "pwsh must be >= '${verMajor}.${verMinor}' .. found '$($PSVersionTable.PSVersion)' .. aborting"
  exit 1
}

${env:WUT_URL} = 'http://yard.lan:9000'

Set-Alias -Name wut -Value 'wut_wrap'

function wut_wrap {
  pwsh -nologo -noprofile -command {
    $WUT_URL = ${env:WUT_URL}.TrimEnd('/')
    $WUT_URL += "/$($args -join '/')".TrimEnd('/')
    $WUT_URL += '/?sysSh=pwsh'

    Invoke-RestMethod -Uri "${WUT_URL}" | Invoke-Expression
  } -args $args
}
```
