def scriptHasCmd [...cmds: string] {
  $cmds | any { |cmd| which $cmd | is-not-empty }
}

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
def scriptFindGroup [label: string, ...entries: string] {
  let tools = (
    $entries
      | each { |entry| $entry | split row '=' }
      | where { |parts|
        let cmds = ($parts | get -o 1 | default '')
        ($cmds | is-empty) or (scriptHasCmd ...($cmds | split row ','))
      }
      | each { |parts| $parts | get 0 }
  )
  if ($tools | is-empty) {
    return
  }
  opPrint $label
  opPrint $"  ($tools | str join ', ')"
}

def --env scriptPlanAdd [action: string, tool: string, shell: string, ...cmds: string] {
  if ($cmds | is-not-empty) and not (scriptHasCmd ...$cmds) {
    return
  }
  load-env {SCRIPT_PLAN_ROWS: (($env.SCRIPT_PLAN_ROWS? | default []) | append $"($action)|($tool)|($shell)")}
}

# one table, one question: a script that runs after this does not ask whether to run
def scriptPlanShow [] {
  let rows = (($env.SCRIPT_PLAN_ROWS? | default []) | each { |r| $r | split row '|' })
  if ($rows | is-empty) {
    return false
  }
  let headers = ['action' 'tool' 'shell']
  let widths = ($headers | enumerate | each { |h|
    [($h.item | str length)] ++ ($rows | each { |r| $r | get -o $h.index | default '' | str length }) | math max
  })
  let line = { |cells: list<string>|
    $cells | enumerate | each { |c|
      if $c.index == 2 { $c.item } else { $c.item | fill --alignment left --width ($widths | get $c.index) }
    } | str join ' '
  }
  opPrint (do $line $headers)
  opPrint (do $line ($headers | each { |h| '-' | fill --alignment left --width ($h | str length) --character '-' }))
  for r in $rows { opPrint (do $line $r) }
  mut yn = ''
  if 'YES' in $env {
    $yn = 'y'
  } else {
    opPrint ''
    $yn = input 'use script [y,[n]]: '
  }
  ($yn | str downcase) in ['', 'y', 'yes']
}
