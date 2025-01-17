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

#### Bun [Debian]

```zsh
curl -fLsS https://bun.sh/install | bash
```

#### DotNet / Powershell [Debian]

dotnet: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>

amd64: <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>

arm64: <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

#### NodeJS [Debian]

(Replace 'v' with latest major version)

```zsh
curl -fLsS https://deb.nodesource.com/setup_v.x | sudo -E bash -
```

#### Starship [Debian]

```zsh
curl -fLsSO https://starship.rs/install.sh
sh install.sh -b ${HOME}/.local/bin
rm install.sh
```

#### Uv [Debian]

```zsh
curl -fLsS https://astral.sh/uv/install.sh | sh
```

#### Vim-Plug [Unix]

```zsh
sh -c 'curl -fLsSo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim \
  --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'
```

#### Vim-Plug [Winnt]

```pwsh
iwr -useb https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim |`
  ni "$(@($env:XDG_DATA_HOME, $env:LOCALAPPDATA)[$null -eq $env:XDG_DATA_HOME])/nvim-data/site/autoload/plug.vim"`
  -Force
```

#### Zoxide [Debian]

```zsh
curl -fLsS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
```

#### Yay [Arch]

```zsh
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/yay-bin.git
cd yay-bin
makepkg -si
```

#### Brew [MacOS]

```zsh
curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash -
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
New-Item -ItemType SymbolicLink -Value "${env:HOME}/source/code/meop/wut-config" -Path "${env:HOME}/.wut-config"
New-Item -ItemType SymbolicLink -Value "${env:HOME}/source/code/meop/wut" -Path "${env:HOME}/.wut"
```

Add to profile:

```pwsh
if (Test-Path "${env:HOME}/.wut") {
  Set-Alias -Name wut -Value "${env:HOME}/.wut/bin/wut.ps1"
}
```

### install

TBD
