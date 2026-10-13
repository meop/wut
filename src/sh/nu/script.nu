def scriptHasCmd [...cmds: string] {
  $cmds | any { |cmd| which $cmd | is-not-empty }
}


# ghpm's table: a rule as wide as each header, columns padded to their widest cell, the last one loose
def scriptTable [headers: list<string>, rows: list<list<string>>] {
  let widths = ($headers | enumerate | each { |h|
    [($h.item | str length)] ++ ($rows | each { |r| $r | get -o $h.index | default '' | str length }) | math max
  })
  let line = { |cells: list<string>|
    $cells | enumerate | each { |c|
      if $c.index == (($cells | length) - 1) { $c.item } else { $c.item | fill --alignment left --width ($widths | get $c.index) }
    } | str join ' '
  }
  opPrint (do $line $headers)
  opPrint (do $line ($headers | each { |h| '-' | fill --alignment left --width ($h | str length) --character '-' }))
  for r in $rows { opPrint (do $line $r) }
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

# the listing's groups for what is left out, in the order shown
const SCRIPT_SKIP_DONE = 'already installed'
const SCRIPT_SKIP_MISSING = 'missing tool'
const SCRIPT_SKIPS = [$SCRIPT_SKIP_DONE $SCRIPT_SKIP_MISSING]

# why the cheap gates leave one unit out here, or '' when it is needed: a no_ gate needs none of its commands or
# services here, and a has_ gate needs one of them. whether a script has more to do beyond that is its own to say
def scriptSkip [u: record] {
  if (
    (($u.noCmds | is-not-empty) and (scriptHasCmd ...$u.noCmds))
    or (($u.noSvcs | is-not-empty) and (scriptHasSvc ...$u.noSvcs))
  ) {
    $SCRIPT_SKIP_DONE
  } else if (
    (($u.cmds | is-not-empty) and not (scriptHasCmd ...$u.cmds))
    or (($u.svcs | is-not-empty) and not (scriptHasSvc ...$u.svcs))
  ) {
    $SCRIPT_SKIP_MISSING
  } else {
    ''
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

  scriptTable ['action' 'tool' 'shell'] ($here | enumerate | each { |u|
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

# the listing: each action with the tools needed here, then a group per reason for the ones the gates leave out
def scriptFindRun [] {
  let units = ($env.SCRIPT_PLAN? | default '[]' | from json | each { |u| $u | insert skipped (scriptSkip $u) })
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
  if ($rows | is-empty) {
    return
  }
  opPrint ''
  scriptTable ['action' 'tools'] ($rows | each { |r|
    [($r | get 0), (($r | get 1 | split row ', ') | length | into string)]
  })
}
