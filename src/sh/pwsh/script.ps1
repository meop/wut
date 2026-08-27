function scriptHasCmd {
  foreach ($cmd in $args) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
      return $true
    }
  }
  return $false
}

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
$script:ScriptFindRows = @()

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
function scriptFindAdd {
  $action = $args[0]
  $entries = if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() }
  $tools = @()
  foreach ($entry in $entries) {
    $parts = $entry -split '=', 2
    if ($parts.Count -eq 1) {
      $tools += $parts[0]
    } else {
      $cmdList = $parts[1] -split ','
      if (scriptHasCmd @cmdList) {
        $tools += $parts[0]
      }
    }
  }
  if ($tools.Count -eq 0) {
    return
  }
  $script:ScriptFindRows += , @($action, ($tools -join ', '))
}

# one table, one question, then the listing
function scriptFindShow {
  if ($script:ScriptFindRows.Count -eq 0) {
    return
  }
  $headers = @('action', 'tools')
  $aw = (@($headers[0].Length) + ($script:ScriptFindRows | ForEach-Object { $_[0].Length }) | Measure-Object -Maximum).Maximum
  opPrint ($headers[0].PadRight($aw) + ' ' + $headers[1])
  opPrint (('-' * $headers[0].Length).PadRight($aw) + ' ' + ('-' * $headers[1].Length))
  foreach ($r in $script:ScriptFindRows) {
    opPrint ($r[0].PadRight($aw) + ' ' + ($r[1] -split ', ').Count)
  }
  $yn = ''
  if ($YES) {
    $yn = 'y'
  } else {
    opPrint ''
    $yn = Read-Host 'use script [y,[n]]'
  }
  $yn = [string]$yn
  if (-not (($yn -eq '') -or ($yn.ToLower() -eq 'y') -or ($yn.ToLower() -eq 'yes'))) {
    return
  }
  foreach ($r in $script:ScriptFindRows) {
    opPrint $r[0]
    opPrint ('  ' + $r[1])
  }
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
  $yn = [string]$yn
  return ($yn -eq '') -or ($yn.ToLower() -eq 'y') -or ($yn.ToLower() -eq 'yes')
}
