def rmInnerStr [value] {
  return ($value | str trim --left --char 'r' | str trim --char '#' | str trim --char `'`)
}

def envReplace [line] {
  let envItems = $env | items { |key, value| [$key, $value] }

  mut l = $line
  if ($l | str contains '{') {
    for e in ($envItems | where { |e| (($e.0 | describe) == 'string') and (($e.1 | describe) == 'string') }) {
      $l = $l | str replace --all $"{($e.0)}" ($e.1)
    }
  }

  return $l
}

def file [] {
  mut yn = ''

  if 'YES' in $env {
    $yn = 'y'
  } else {
    $yn = input $"? use file \(user\) [y, [n]] "
  }
  if $yn != 'n' {
    fileOp
  }
}
