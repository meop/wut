# wut

Web Update Tool

This tool is expected to be run locally and interactively

Some operations cannot work over SSH because they are installing GUI tools

Some operations create dynamic prompts for the user and cannot be scripted

## targets

Same targets as Bun

## unix

Linux

MacOS

### cli

Required:

- zsh
- bun

Link repo:

```zsh
ln -s "${HOME}/source/code/meop/wut" "${HOME}/.wut"
ln -s "${HOME}/source/code/meop/wut-config" "${HOME}/.wut-config"
```

Add to profile:

```zsh
if [[ -d "${HOME}/.wut" ]]; then
  alias wut="${HOME}/.wut/bin/cli.zsh"
fi
```

### web

Required:

- zsh

Add to profile:

```zsh
alias wut=wut_wrap
function wut_wrap {
  curl -fLsS --url 'http://yard.lan:9000/zsh' | zsh
}
```

## winnt

Windows

### cli

Required:

- pwsh
- bun

Link repo:

```pwsh
New-Item -ItemType SymbolicLink -Value "${env:HOME}/source/code/meop/wut" -Path "${env:HOME}/.wut"
New-Item -ItemType SymbolicLink -Value "${env:HOME}/source/code/meop/wut-config" -Path "${env:HOME}/.wut-config"
```

Add to profile:

```pwsh
if (Test-Path "${env:HOME}/.wut") {
  Set-Alias -Name wut -Value "${env:HOME}/.wut/bin/cli.ps1"
}
```

### web

Required:

- pwsh

Add to profile:

```pwsh
Set-Alias -Name wut -Value wut_wrap
function wut_wrap {
  Invoke-RestMethod -Uri 'http://yard.lan:9000/pwsh' | Invoke-Expression
}
```
