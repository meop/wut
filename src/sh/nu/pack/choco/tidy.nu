def --env packChocoOp [cmd] {
  opPrintMaybeRunCmd $cmd cache remove
  let orphans = (glob 'C:\ProgramData\chocolatey\lib\**\*.nuspec' | where { |f|
    (open --raw $f | str contains '<dependency') == false
  } | each { |f| $f | path basename | str replace '.nuspec' '' })
  if ($orphans | is-not-empty) {
    opPrintMaybeRunCmd $cmd uninstall ...$orphans --force-dependencies
  }
}
