def --env packCargoOp [cmd] {
  for name in ($env.PACK_ADD_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
  let install_args = if ((^$cmd install --list) | str contains 'cargo-binstall') { ['binstall'] } else { ['install', '--locked'] }
  opPrintMaybeRunCmd $cmd ...$install_args $env.PACK_ADD_NAMES
  $env.PACKED = true
}
