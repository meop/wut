SH_VERSION_MAJOR=5
SH_VERSION_MINOR=9

autoload is-at-least
if ! is-at-least "${SH_VERSION_MAJOR}.${SH_VERSION_MINOR}"; then
  echo "zsh must be >= '${SH_VERSION_MAJOR}.${SH_VERSION_MINOR}' .. found '${ZSH_VERSION}' .. aborting" >&2
  exit 1
fi
