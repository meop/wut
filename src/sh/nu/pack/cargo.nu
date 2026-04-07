def --env packCargo [] {
  let cmd = 'cargo'
  if ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or (which $cmd | is-empty) {
    return
  }
  if ('PACK_OP' in $env) and ($env.PACK_OP in ['add', 'rem']) and ($env.PACKED? | default false) {
    return
  }
  mut yn = ''
  if 'YES' in $env {
    $yn = 'y'
  } else {
    $yn = input $"? use ($cmd) \(user\) [y, [n]]: "
  }
  if $yn == 'n' {
    return
  }
  packCargoOp $cmd
}
