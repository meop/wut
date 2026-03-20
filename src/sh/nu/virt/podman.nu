def virtPodman [] {
  let cmd = 'podman'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $cmd | is-empty) {
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
  virtPodmanOp $cmd
}
