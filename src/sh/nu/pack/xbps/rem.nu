def --env packXbpsOp [cmd] {
  opPrintMaybeRunCmd $"($cmd)-remove" --recursive $env.PACK_REM_NAMES
  $env.PACKED = true
}
