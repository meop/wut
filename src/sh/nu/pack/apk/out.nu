def --env packApkOp [cmd] {
  let filterArgs = $env.PACK_OUT_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd list -u '|' complete '|' get stdout '|' str trim --right ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd list -u
  }
}
