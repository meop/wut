def --env packXbpsOp [cmd] {
  let rem_cmd = $cmd | str replace 'xbps-install' 'xbps-remove'
  opPrintMaybeRunCmd $rem_cmd --recursive $env.PACK_REM_NAMES
  $env.PACKED = true
  for name in ($env.PACK_REM_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
}
