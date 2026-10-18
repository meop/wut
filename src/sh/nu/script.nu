def scriptHasCmd [...cmds: string] {
  $cmds | any { |cmd| which $cmd | is-not-empty }
}



# a service is how a windows feature shows it is installed: sc.exe knows one by name (1060 is no such service), and on
# linux a systemd unit file names one. a check per name, no shell to start
def scriptHasSvc [...svcs: string] {
  $svcs | any { |s|
    match $nu.os-info.name {
      'windows' => ((^sc.exe query $s | complete | get exit_code) == 0)
      'linux' => (['/etc/systemd/system' '/usr/lib/systemd/system' '/lib/systemd/system'] | any { |d| [$d $"($s).service"] | path join | path exists })
      _ => false
    }
  }
}

# a path is how a macos app shows it is installed, or a tool that leaves a directory and no command. ~ is the home dir
def scriptHasPath [...paths: string] {
  $paths | any { |p| $p | path expand | path exists }
}

# the listing's groups for what is left out, in the order shown: the least to put right first, and last the one with
# nothing to put right
const SCRIPT_SKIP_MISSING = 'unmet tool dependency'
const SCRIPT_SKIP_DESKTOP = 'no desktop session'
const SCRIPT_SKIP_DESKTOP_WRONG = 'wrong desktop session'
const SCRIPT_SKIP_FOUND = 'found tool already'
const SCRIPT_SKIPS = [$SCRIPT_SKIP_MISSING $SCRIPT_SKIP_DESKTOP $SCRIPT_SKIP_DESKTOP_WRONG $SCRIPT_SKIP_FOUND]

# the has_ gates a unit fails: its commands, its services and its paths, where it needs one of them and has none
def scriptShort [u: record] {
  [
    (if (($u.cmds | is-not-empty) and not (scriptHasCmd ...$u.cmds)) { $u.cmds } else { [] })
    (if (($u.svcs | is-not-empty) and not (scriptHasSvc ...$u.svcs)) { $u.svcs } else { [] })
    (if (($u.paths | is-not-empty) and not (scriptHasPath ...$u.paths)) { $u.paths } else { [] })
  ] | where { |names| $names | is-not-empty }
}

# why the cheap gates leave one unit out here, or '' when it is needed: a no_ gate needs none of its commands or
# services here, and a has_ gate needs one of its commands, services or paths. a unit that fails more than one is listed under the last of its
# groups: a wrong desktop before no desktop session, which ssh is to a no_ssh script, before a missing tool. so a
# missing tool is said only where the tool is all that is short. whether a script has more to do beyond that is its
# own to say
def scriptSkip [u: record] {
  if (
    (($u.noCmds | is-not-empty) and (scriptHasCmd ...$u.noCmds))
    or (($u.noSvcs | is-not-empty) and (scriptHasSvc ...$u.noSvcs))
  ) {
    $SCRIPT_SKIP_FOUND
  } else if $u.desktop == 'other' {
    $SCRIPT_SKIP_DESKTOP_WRONG
  } else if $u.desktop == 'none' or ($u.noSsh and ('SSH_CONNECTION' in $env)) {
    $SCRIPT_SKIP_DESKTOP
  } else if (scriptShort $u | is-not-empty) {
    $SCRIPT_SKIP_MISSING
  } else {
    ''
  }
}

# a tool as the missing group names it: with what it is short of, where that goes by another name than its own
def scriptShortName [u: record] {
  let short = (scriptShort $u)
  if ($u.tool in ($short | flatten)) {
    $u.tool
  } else {
    $"($u.tool) \(($short | each { |names| $names | str join ' or ' } | str join '; ')\)"
  }
}

def scriptNeeded [u: record] {
  (scriptSkip $u) == ''
}

# what this machine is offered
def scriptPlanHere [] {
  $env.SCRIPT_PLAN? | default '[]' | from json | where { |u| scriptNeeded $u }
}

def --env scriptPlanRun [] {
  let here = (scriptPlanHere)
  if ($here | is-empty) {
    opPrintWarn 'nothing to do'
    return
  }

  wutTable ['action' 'tool' 'shell'] ($here | enumerate | each { |u|
    [$"($u.index + 1)\) ($u.item.action)", $u.item.tool, $u.item.shell]
  })
  let picked = (wutSelectRead ($here | length))
  if $picked == null {
    return
  }
  for i in $picked {
    scriptRunUnit ($here | get ($i - 1) | get id)
  }
}

# rows of action and its tools, in action order
def scriptFindRows [units: list] {
  $units
    | group-by action
    | transpose action units
    | sort-by action
    | each { |g| [$g.action, ($g.units | get tool | uniq | sort | str join ', ')] }
}

# the listing: each action with the tools needed here, then a group per reason for the ones the gates leave out. a
# missing tool is named with the command or service it is short of
def scriptFindRun [] {
  let units = ($env.SCRIPT_PLAN? | default '[]' | from json | each { |u|
    let skipped = (scriptSkip $u)
    let tool = (if $skipped == $SCRIPT_SKIP_MISSING { scriptShortName $u } else { $u.tool })
    $u | insert skipped $skipped | update tool $tool
  })
  let rows = (scriptFindRows ($units | where skipped == ''))
  for r in $rows {
    opPrint ($r | get 0)
    opPrint $"  ($r | get 1)"
  }
  mut shown = ($rows | is-not-empty)
  for group in $SCRIPT_SKIPS {
    let groupRows = (scriptFindRows ($units | where skipped == $group))
    if ($groupRows | is-empty) {
      continue
    }
    if $shown {
      opPrint ''
    }
    opPrint $group
    for r in $groupRows {
      opPrint $"  ($r | get 0)"
      opPrint $"    ($r | get 1)"
    }
    $shown = true
  }
}
