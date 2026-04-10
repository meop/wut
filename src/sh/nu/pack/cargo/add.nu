def --env packCargoOp [cmd] {
  opPrintMaybeRunCmd $cmd binstall --locked $env.PACK_ADD_NAMES
  $env.PACKED = true
}
