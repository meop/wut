def --env packXbpsOp [cmd] {
  let terms = $env.PACK_FIND_NAMES? | default '' | split words
  if ($terms | is-empty) {
    opPrintMaybeRunCmd xbps-query --repository --search ''
  } else {
    for term in $terms {
      opPrintMaybeRunCmd xbps-query --repository --search $term
    }
  }
}
