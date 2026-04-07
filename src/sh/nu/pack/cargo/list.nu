def --env packCargoOp [cmd] {
  let filterArgs = $env.PACK_LIST_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd install --list ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd install --list
  }
}
