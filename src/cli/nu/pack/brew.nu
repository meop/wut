def packBrew [] {
  let cmd = 'brew'
  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
    }
    if $yn != 'n' {
      packBrewOp $cmd
    }
  }
}
