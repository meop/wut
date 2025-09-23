def packDnf [] {
  try {
    let cmd = 'dnf'
    if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
      mut yn = ''
      if 'YES' in $env {
        $yn = 'y'
      } else {
        $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
      }
      if $yn != 'n' {
        let cmd = if (which sudo | is-not-empty) { $"sudo ($cmd)" } else { $cmd }
        packDnfOp $cmd
      }
    }
  } catch { |e|
    if not (($e.msg | str downcase) == 'i/o error') {
      error make $e
    }
  }
}
