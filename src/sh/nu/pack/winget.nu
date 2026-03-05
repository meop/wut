def packWinget [] {
  try {
    let cmd = 'winget'
    if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
      if $env.PACK_OP == 'tidy' {
        return
      }
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
  } catch { |e|
    if not (($e.msg | str downcase) == 'i/o error') {
      error make $e
    }
  }
}
