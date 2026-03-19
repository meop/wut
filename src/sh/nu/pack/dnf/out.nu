def --env packDnfOp [cmd] {
  let filterArgs = $env.PACK_OUT_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd list --upgrades ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd list --upgrades
  }
}
