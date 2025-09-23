def virtQemu [] {
  try {
    let cmd = 'qemu'
    let cmdSysArch = $"($cmd)-system-($env.SYS_CPU_ARCH)"
    if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $cmdSysArch | is-not-empty) {
      mut yn = ''
      if 'YES' in $env {
        $yn = 'y'
      } else {
        $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
      }
      if $yn != 'n' {
        virtQemuOp $cmd $cmdSysArch
      }
    }
  } catch { |e|
    if not (($e.msg | str downcase) == 'i/o error') {
      error make $e
    }
  }
}
