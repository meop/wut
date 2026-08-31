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
  let bin = match $manager {
    docker => 'docker',
    lxc => 'lxc-ls',
    podman => 'podman',
    qemu => 'qemu-img',
    _ => $manager,
  }
  which $bin | is-not-empty
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

  for e in $here {
    opPrint $e.manager
    if ($e.instances | is-not-empty) {
      opPrint $"  ($e.instances | str join ', ')"
    }
  }

  opPrint ''
  # an empty instance list is not none, it is every one the manager has, which only the manager can name
  virtTable ['manager' 'instances'] ($here | enumerate | each { |e|
    [$"($e.index + 1)\) ($e.item.manager)", (if ($e.item.instances | is-empty) { 'all' } else { $e.item.instances | length | into string })]
  })
  let picked = (wutSelectRead ($here | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $here | get ($i - 1) })

  $env.VIRT_AGREED = '1'
  for entry in $chosen {
    load-env {VIRT_MANAGER: $entry.manager, VIRT_INSTANCES: $entry.instances}
    virtCallManager $entry.manager
    hide-env VIRT_MANAGER
  }
}

def --env virtFindRun [] {
  let groups = ($env.VIRT_FIND? | default '{}' | from json | transpose manager entries)
  let here = ($groups | where { |g| virtManagerHere $g.manager })

  if ($here | is-empty) {
    let missing = ($groups | each { |g| $g.manager })
    if ($missing | is-not-empty) {
      opPrintWarn $"manager not installed: ($missing | str join ', ')"
    }
    return
  }

  for g in $here {
    opPrint $g.manager
    for entry in $g.entries {
      let parts = ($entry | split row '=')
      let pod = ($parts | get 0)
      let instances = ($parts | get -o 1 | default '' | split row ',' | where { is-not-empty })
      if ($pod | is-empty) {
        if ($instances | is-not-empty) { opPrint $"  ($instances | str join ', ')" }
      } else {
        opPrint $"  ($pod)"
        if ($instances | is-not-empty) { opPrint $"    ($instances | str join ', ')" }
      }
    }
  }
}

