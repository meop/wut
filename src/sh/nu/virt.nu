def virtDeepMerge [base, override] {
  mut result = $base
  for kv in ($override | transpose key value) {
    if ($kv.key in $result) {
      let baseVal = $result | get $kv.key
      let baseDesc = ($baseVal | describe)
      let overrideDesc = ($kv.value | describe)
      if ($baseDesc | str starts-with record) and ($overrideDesc | str starts-with record) {
        $result = $result | upsert $kv.key (virtDeepMerge $baseVal $kv.value)
      } else if ($baseDesc | str starts-with list) and ($overrideDesc | str starts-with list) {
        $result = $result | upsert $kv.key ($baseVal | append $kv.value)
      } else {
        $result = $result | upsert $kv.key $kv.value
      }
    } else {
      $result = $result | upsert $kv.key $kv.value
    }
  }
  $result
}


def virtManagerHere [manager: string] {
  which $manager | is-not-empty
}

def --env virtCallManager [manager: string] {
  match $manager {
    docker => { virtDocker },
    lxc => { virtLxc },
    podman => { virtPodman },
    qemu => { virtQemu },
    _ => {},
  }
}

# ghpm's table: a rule as wide as each header, columns padded to their widest cell, the last one loose
def virtTable [headers: list<string>, rows: list<list<string>>] {
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

# one table, one question, then a run that does not ask again
def --env virtPlanRun [] {
  let plan = ($env.VIRT_PLAN? | default '{}' | from json)
  let here = ($plan | transpose manager instances | where { |e| virtManagerHere $e.manager })

  if ($here | is-empty) {
    let missing = ($plan | transpose manager instances | each { |e| $e.manager })
    if ($missing | is-not-empty) {
      opPrintWarn $"manager not installed: ($missing | str join ', ')"
    }
    return
  }

  virtTable ['manager' 'instances'] ($here | each { |e| [$e.manager, ($e.instances | str join ', ')] })
  if not (virtPrompt 'use virt') { return }

  $env.VIRT_AGREED = '1'
  for entry in $here {
    load-env {VIRT_MANAGER: $entry.manager, VIRT_INSTANCES: $entry.instances}
    virtCallManager $entry.manager
    hide-env VIRT_MANAGER
  }
}

def virtPrompt [label: string] {
  mut yn = ''
  if YES in $env {
    $yn = 'y'
  } else {
    $yn = input $"($label) [y,[n]]: "
  }
  ($yn | str lowercase) in ['', 'y', 'yes']
}
