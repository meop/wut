def packWinget [] {
  let cmd = 'winget'

  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? use ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      packWingetOp $cmd
    }
  }
}
