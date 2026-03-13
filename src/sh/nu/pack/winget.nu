def --env packWinget [] {
  let cmd = 'winget'
  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if $env.PACK_OP == 'tidy' {
      return
    }
    if not (('PACK_OP' in $env) and ($env.PACK_OP in ['add', 'rem']) and ($env.PACKED? | default false)) {
      mut yn = ''
      if 'YES' in $env {
        $yn = 'y'
      } else {
        $yn = input $"? use ($cmd) \(system/user\) [y, [n]]: "
      }
      if $yn != 'n' {
        packWingetOp $cmd
      }
    }
  }
}
