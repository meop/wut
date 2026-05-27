$env.SHELL = which nu | get path

if USERNAME in $env {
  $env.USER = $env.USERNAME
}

if USERPROFILE in $env {
  $env.HOME = $env.USERPROFILE
}

def --env path-ensure [p: string] {
  let np = ($p | path expand)
  if ($np | path exists) and not ($np in $env.PATH) {
    $env.PATH = ($env.PATH | prepend $np)
  }
}
