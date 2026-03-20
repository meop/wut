def --env packWinget [] {
  let cmd = 'winget'
  if ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or (which $cmd | is-empty) {
    return
  }
  if $env.PACK_OP == 'tidy' {
    return
  }
  if ('PACK_OP' in $env) and ($env.PACK_OP in ['add', 'rem']) and ($env.PACKED? | default false) {
    return
  }
  mut yn = ''
  if 'YES' in $env {
    $yn = 'y'
  } else {
    $yn = input $"? use ($cmd) \(system/user\) [y, [n]]: "
  }
  if $yn == 'n' {
    return
  }
  packWingetOp $cmd
}
