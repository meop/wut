$env.SHELL = which nu | get path

if 'USERNAME' in $env {
  $env.USER = $env.USERNAME
}

if 'USERPROFILE' in $env {
  $env.HOME = $env.USERPROFILE
}
