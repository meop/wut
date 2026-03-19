def --env packDnfOp [cmd] {
  let filterArgs = $env.PACK_LIST_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd list --installed ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd list --installed
  }
}
