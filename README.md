# wut

web update tool

## targets

amd64 linux
amd64 macos
amd64 windows

arm64 linux
arm64 macos

## unix

### prereqs

- bash
- git
- bun

### develop

- link repo

```bash
ln -s "$HOME/source/code/meop/wut" "$HOME/.wut"
```

- add to profile

```bash
export WUT_LOCATION="$HOME/.wut"
alias wut="bash $WUT_LOCATION/bin/wut.sh"
```

### install

TBD

## winnt

Windows

### prereqs

- pwsh
- git
- bun

### develop

- link repo

```pwsh
New-Item -ItemType SymbolicLink -Value "$HOME/source/code/meop/wut" -Path "$HOME/.wut"
```

- add to profile

```pwsh
$env:WUT_LOCATION = "$HOME/.wut"
Set-Alias -Name wut -Value "pwsh $WUT_LOCATION/bin/wut.ps1"
```

### install

TBD
