def packWinget [] {
  try {
    let cmd = 'winget'
    if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
      mut yn = ''
      if 'YES' in $env {
        $yn = 'y'
      } else {
        $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
      }
      if $yn != 'n' {
        packWingetOp $cmd
      }
    }
  } catch { |e|
    if not (($e.msg | str downcase) == 'external command had a non-zero exit code') {
      error make $e
    }
  }
}
