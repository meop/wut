function () {
  local sh_version_major=5
  local sh_version_minor=9

  autoload is-at-least
  if ! is-at-least "${sh_version_major}.${sh_version_minor}"; then
    opPrintErr "zsh must be >= '${sh_version_major}.${sh_version_minor}' .. found '${ZSH_VERSION}' .. aborting"
    exit 1
  fi
}
