def --env packWingetOp [cmd] {
  let filterArgs = $env.PACK_LIST_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd list ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd list
  }
}
