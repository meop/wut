def --env packXbpsOp [cmd] {
  let filterArgs = $env.PACK_LIST_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd xbps-query --list-pkgs '|' complete '|' get stdout '|' str trim --right ...$filterArgs
  } else {
    opPrintMaybeRunCmd xbps-query --list-pkgs
  }
}
