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

# what this machine is offered, from the cheap gates alone: a has_ gate needs one of its commands or services here, a
# no_ gate needs none of them, so an install leaves the listing once its tool is in. whether a script has more to do
# beyond that is its own to say once it runs
def scriptPlanHere [] {
  $env.SCRIPT_PLAN? | default '[]' | from json | where { |u|
    (
      (($u.cmds | is-empty) or (scriptHasCmd ...$u.cmds))
      and (($u.noCmds | is-empty) or not (scriptHasCmd ...$u.noCmds))
      and (($u.svcs | is-empty) or (scriptHasSvc ...$u.svcs))
      and (($u.noSvcs | is-empty) or not (scriptHasSvc ...$u.noSvcs))
    )
  }
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

# the listing: each action with the tools that apply here, as virt find lists only the managers installed, and one
# warning when none apply at all
def scriptFindRun [] {
  let here = (scriptPlanHere)
  if ($here | is-empty) {
    let all = ($env.SCRIPT_PLAN? | default '[]' | from json | get tool | uniq | sort)
    if ($all | is-not-empty) {
      opPrintWarn $"not applicable: ($all | str join ', ')"
    }
    return
  }
  let rows = (
    $here
      | group-by action
      | transpose action units
      | sort-by action
      | each { |g| [$g.action, ($g.units | get tool | uniq | sort | str join ', ')] }
  )
  for r in $rows {
    opPrint ($r | get 0)
    opPrint $"  ($r | get 1)"
  }
  opPrint ''
  scriptTable ['action' 'tools'] ($rows | each { |r|
    [($r | get 0), (($r | get 1 | split row ', ') | length | into string)]
  })
}
