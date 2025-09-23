def packScoop [] {
  try {
    let cmd = 'scoop'
    if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
      mut yn = ''
      if 'YES' in $env {
        $yn = 'y'
      } else {
        $yn = input $"? use ($cmd) \(user\) [y, [n]]: "
      }
      if $yn != 'n' {
        packScoopOp $cmd
      }
    }
  } catch { |e|
    if not (($e.msg | str downcase) == 'i/o error') {
      error make $e
    }
  }
}
