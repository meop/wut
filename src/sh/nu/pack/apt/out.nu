def --env packAptOp [cmd] {
  let filterArgs = $env.PACK_OUT_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd list --upgradable '|' complete '|' get stdout '|' str trim --right ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd list --upgradable
  }
}
