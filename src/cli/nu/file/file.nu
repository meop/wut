def rmInner [value] {
  mut value = $value
  if ($value | str starts-with `r#'`) and ($value | str ends-with `'#`) {
    return ($value | str substring 3..-3)
  }
  return $value
}
def replaceEnv [line] {
  mut l = $line
  if ($l | str contains '{') {
    let itemsEnv = $env | items { |key, value| [$key, $value] }
    for e in ($itemsEnv | where { |e| (($e.0 | describe) == 'string') and (($e.1 | describe) == 'string') }) {
      $l = $l | str replace --all $"{($e.0)}" ($e.1)
    }
  }
  return $l
}
def file [] {
  try {
    mut yn = ''
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input r#'? use file (user) [y, [n]]: '#
    }
    if $yn != 'n' {
      fileOp
    }
  } catch { |e|
    if not (($e.msg | str downcase) == 'i/o error') {
      error make $e
    }
  }
}
