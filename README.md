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
ln -s "$HOME/source/code/meop/wut" "$HOME/.wut"
```

- add to profile

```zsh
if [[ -d "$HOME/.wut" ]]; then
  export WUT_LOCATION="$HOME/.wut"
  alias wut="$WUT_LOCATION/bin/wut.sh"
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
New-Item -ItemType SymbolicLink -Value "$env:HOME\source\code\meop\wut" -Path "$env:HOME\.wut"
```

- add to profile

```pwsh
if (Test-Path "$env:HOME\.wut") {
  $env:WUT_LOCATION = "$env:HOME\.wut"
  Set-Alias -Name wut -Value "$env:WUT_LOCATION\bin\wut.ps1"
}
```

### install

TBD
