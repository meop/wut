def --env packPacman [] {
  let cmd = 'pacman'
  if 'PACK_MANAGER' not-in $env and ((which yay | is-not-empty) or (which paru | is-not-empty)) {
    return
  }
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
    $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
  }
  if $yn == 'n' {
    return
  }
  let cmd = if (which sudo | is-not-empty) { $"sudo ($cmd)" } else { $cmd }
  if 'PACK_OP' in $env and ($env.PACK_OP == 'add' or $env.PACK_OP == 'find' or $env.PACK_OP == 'out' or $env.PACK_OP == 'sync') {
    opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
  }
  packPacmanOp $cmd
}
