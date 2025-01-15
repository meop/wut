# wut

Web Update Tool

This tool is expected to be run locally and interactively

Some operations cannot work over SSH because they are installing GUI tools

Some operations create dynamic prompts for the user and cannot be scripted

## targets

Same targets as NodeJS

## unix

Linux

MacOS

### prereqs

Yay [Arch]:

```zsh
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/yay-bin.git
cd yay-bin
makepkg -si
```

Brew [MacOS]:

```zsh
curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh
```

- zsh
- node
- git

### develop

Link repo:

```zsh
ln -s "${HOME}/source/code/meop/wut-config" "${HOME}/.wut-config"
ln -s "${HOME}/source/code/meop/wut" "${HOME}/.wut"
```

Add to profile:

```zsh
if [[ -d "${HOME}/.wut" ]]; then
  alias wut="${HOME}/.wut/bin/wut.zsh"
fi
```

### install

TBD

## winnt

Windows

### prereqs

Scoop [Windows]:

```pwsh
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

- pwsh
- node
- git

### develop

Link repo:

```pwsh
New-Item -ItemType SymbolicLink -Value "${env:HOME}\source\code\meop\wut-config" -Path "${env:HOME}\.wut-config"
New-Item -ItemType SymbolicLink -Value "${env:HOME}\source\code\meop\wut" -Path "${env:HOME}\.wut"
```

Add to profile:

```pwsh
if (Test-Path "${env:HOME}\.wut") {
  Set-Alias -Name wut -Value "${env:HOME}\.wut\bin\wut.ps1"
}
```

### install

TBD
