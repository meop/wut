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

def --env scriptPlanRun [] {
  let units = ($env.SCRIPT_PLAN? | default '[]' | from json)
  # a has_cmd gate is the client's: a script whose tool is missing is not offered, and an action alone is all wut has
  let here = ($units | where { |u| ($u.cmds | is-empty) or (scriptHasCmd ...$u.cmds) })
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

# find accumulates the same way the plan does, so all three shells share one idiom
def --env scriptFindAdd [action: string, ...entries: string] {
  let tools = (
    $entries | each { |e| $e | split row '=' }
      | where { |p|
        let cmds = ($p | get -o 1 | default '')
        ($cmds | is-empty) or (scriptHasCmd ...($cmds | split row ','))
      }
      | each { |p| $p | get 0 }
  )
  if ($tools | is-empty) {
    return
  }
  load-env {SCRIPT_FIND_ROWS: (($env.SCRIPT_FIND_ROWS? | default []) | append $"($action)|($tools | str join ', ')")}
}

# one table, one question, then the listing
def scriptFindShow [] {
  let rows = (($env.SCRIPT_FIND_ROWS? | default []) | each { |r| $r | split row '|' })
  if ($rows | is-empty) {
    return
  }
  for r in $rows {
    opPrint ($r | get 0)
    opPrint $"  ($r | get 1)"
  }
  opPrint ''
  scriptTable ['action' 'tools'] ($rows | each { |r|
    [($r | get 0), (($r | get 1 | split row ', ') | length | into string)]
  })
}
