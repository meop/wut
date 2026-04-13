def --env packXbpsOp [cmd] {
  opPrintMaybeRunCmd $"($cmd)-remove" --clean-cache --clean-cache
  opPrintMaybeRunCmd $"($cmd)-remove" --remove-orphans
}
