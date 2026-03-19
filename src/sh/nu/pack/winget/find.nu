def --env packWingetOp [cmd] {
  let terms = $env.PACK_FIND_NAMES? | default '' | split words
  if ($terms | is-empty) {
    opPrintMaybeRunCmd $cmd search
  } else {
    for term in $terms {
      opPrintMaybeRunCmd $cmd search $term
    }
  }
}
