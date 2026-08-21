function scriptHasCmd {
  foreach ($cmd in $args) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
      return $true
    }
  }
  return $false
}

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
function scriptFindGroup {
  if ($args.Count -lt 2) {
    return
  }
  $label = $args[0]
  $tools = @()
  foreach ($entry in $args[1..($args.Count - 1)]) {
    $name, $cmds = $entry -split '=', 2
    if (-not $cmds) {
      $tools += $name
      continue
    }
    $cmdList = $cmds -split ','
    if (scriptHasCmd @cmdList) {
      $tools += $name
    }
  }
  if (-not $tools) {
    return
  }
  opPrint $label
  opPrint "  $($tools -join ', ')"
}
