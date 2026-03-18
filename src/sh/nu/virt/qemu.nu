def virtQemu [] {
  let cmd = 'qemu'
  if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $"($cmd)-img" | is-not-empty) {
    if $env.VIRT_OP == 'tidy' {
      return
    }
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
    }
    if $yn != 'n' {
      virtQemuOp $cmd
    }
  }
}
