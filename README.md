# wut

Web Update Tool

## targets

same targets as NodeJS

## unix

Linux
MacOS

### prereqs

- zsh
- node
- git

### develop

- link repo

```zsh
ln -s "$HOME/source/code/meop/wut-config" "$HOME/.wut-config"
ln -s "$HOME/source/code/meop/wut" "$HOME/.wut"
```

- add to profile

```zsh
if [[ -d "$HOME/.wut" ]]; then
  alias wut="$HOME/.wut/bin/wut.zsh"
fi
```

### install

TBD

## winnt

Windows

### prereqs

- pwsh
- node
- git

### develop

- link repo

```pwsh
New-Item -ItemType SymbolicLink -Value "$env:HOME\source\code\meop\wut-config" -Path "$env:HOME\.wut-config"
New-Item -ItemType SymbolicLink -Value "$env:HOME\source\code\meop\wut" -Path "$env:HOME\.wut"
```

- add to profile

```pwsh
if (Test-Path "$env:HOME\.wut") {
  Set-Alias -Name wut -Value "$env:HOME\.wut\bin\wut.ps1"
}
```

### install

TBD
