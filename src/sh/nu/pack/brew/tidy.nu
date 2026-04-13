def --env packBrewOp [cmd] {
  opPrintMaybeRunCmd $cmd cleanup --prune=all --scrub
  opPrintMaybeRunCmd $cmd autoremove
}
