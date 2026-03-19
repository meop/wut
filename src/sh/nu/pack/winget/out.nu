def --env packWingetOp [cmd] {
  let filterArgs = $env.PACK_OUT_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd upgrade ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd upgrade
  }
}
