sh_version_major=5
sh_version_minor=9

autoload is-at-least
if ! is-at-least "${sh_version_major}.${sh_version_minor}"; then
  echo "zsh must be >= '${sh_version_major}.${sh_version_minor}' .. found '${ZSH_VERSION}' .. aborting" >&2
  exit 1
fi
