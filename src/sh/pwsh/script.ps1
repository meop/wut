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

$script:ScriptPlanRows = @()

function scriptPlanAdd {
  $action, $tool, $shell = $args[0..2]
  $cmds = if ($args.Count -gt 3) { $args[3..($args.Count - 1)] } else { @() }
  if ($cmds.Count -gt 0) {
    if (-not (scriptHasCmd @cmds)) {
      return
    }
  }
  $script:ScriptPlanRows += , @($action, $tool, $shell)
}

# one table, one question: a script that runs after this does not ask whether to run
function scriptPlanShow {
  if ($script:ScriptPlanRows.Count -eq 0) {
    return $false
  }
  $headers = @('action', 'tool', 'shell')
  $widths = 0..2 | ForEach-Object {
    $i = $_
    (@($headers[$i].Length) + ($script:ScriptPlanRows | ForEach-Object { $_[$i].Length }) | Measure-Object -Maximum).Maximum
  }
  $line = {
    param($cells)
    (0..2 | ForEach-Object {
      if ($_ -eq 2) { $cells[$_] } else { $cells[$_].PadRight($widths[$_]) }
    }) -join ' '
  }
  opPrint (& $line $headers)
  opPrint (& $line @(0..2 | ForEach-Object { '-' * $headers[$_].Length }))
  foreach ($r in $script:ScriptPlanRows) { opPrint (& $line $r) }
  $yn = ''
  if ($YES) {
    $yn = 'y'
  } else {
    opPrint ''
    $yn = Read-Host 'use script [y,[n]]'
  }
  return ($yn -eq '') -or ($yn.ToLower() -eq 'y') -or ($yn.ToLower() -eq 'yes')
}
