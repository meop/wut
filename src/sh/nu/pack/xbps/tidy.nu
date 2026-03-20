def --env packXbpsOp [cmd] {
  let rem_cmd = $cmd | str replace 'xbps-install' 'xbps-remove'
  opPrintMaybeRunCmd $rem_cmd --remove-orphans
}
