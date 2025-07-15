function () {
  local sh_ver_major=5
  local sh_ver_minor=9

  autoload is-at-least
  if ! is-at-least "${sh_ver_major}.${sh_ver_minor}"; then
    opPrintErr "zsh must be >= '${sh_ver_major}.${sh_ver_minor}' .. found '${ZSH_VERSION}' .. aborting"
    exit 1
  fi
}
