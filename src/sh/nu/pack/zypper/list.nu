def packZypperOp [cmd] {
  if 'PACK_LIST_NAMES' in $env {
    opPrintMaybeRunCmd $cmd search --installed-only '|' complate '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_LIST_NAMES
  } else {
    opPrintMaybeRunCmd $cmd search --installed-only
  }
}
