def virtQemu [] {
  let cmd = 'qemu'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $"($cmd)-img" | is-empty) {
    return
  }
  if $env.VIRT_OP == 'tidy' {
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
  virtQemuOp $cmd
}
