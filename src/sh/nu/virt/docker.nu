def virtDocker [] {
  let cmd = 'docker'
  if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
    }
    if $yn != 'n' {
      virtDockerOp $cmd
    }
  }
}
