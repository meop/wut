def --env packXbpsOp [cmd] {
  if ($env.PACK_SYNC_NAMES? | is-not-empty) {
    opPrintMaybeRunCmd $"($cmd)-install" --update $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $"($cmd)-install" --update
  }
}
