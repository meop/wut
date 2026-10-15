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

# whether an instance was added here: the file its manager's add leaves behind, or for docker, which leaves none, the
# compose project the daemon holds, stopped ones included
def virtInstanceHere [manager: string, instance: string, root: string = '/'] {
  let name = ($instance | split row '/' | first)
  match $manager {
    docker => ($name in (^sudo docker compose ls --all --format json | complete | get stdout | if ($in | is-not-empty) { from json | get Name } else { [] })),
    lxc => ([$root 'var/lib/lxc' $name 'config'] | path join | path exists),
    podman => ([$root 'etc/containers/systemd' $"($name).kube"] | path join | path exists),
    qemu => ([$root 'etc/systemd/system' $"qemu-($name).service"] | path join | path exists),
    _ => false,
  }
}

# the names a manager's list shows, narrowed by its terms: each term starts a word of the name, and a name has to
# match every one. list's summary asks this before the gate and each manager's list after it, so what the summary
# says a manager has and what its dump then shows cannot drift
def virtListed [manager: string, terms: list<string> = []] {
  let names = match $manager {
    # --all, as virtInstanceHere has it: a stopped project is still added, and rem and sync still act on it
    docker => (^sudo docker compose ls --all --format json | complete | get stdout | if ($in | is-not-empty) { from json | get Name } else { [] }),
    # bare lxc-ls wraps names across lines at terminal width, not just spaces within one. split on whitespace alone:
    # split words also breaks at a hyphen, which made web-proxy two instances, web and proxy
    lxc => (^sudo lxc-ls | complete | get stdout | split row --regex '\s+' | where { is-not-empty }),
    podman => (virtListedFiles '/etc/containers/systemd' '\.kube$' { |b| $b | str replace '.kube' '' }),
    qemu => (virtListedFiles '/etc/systemd/system' '^qemu-[^/]+\.service$' { |b| $b | str replace 'qemu-' '' | str replace '.service' '' }),
    _ => [],
  }
  $names | where { |n| $terms | all { |t| wutWordMatch $n $t } }
}

def virtListedFiles [dir: string, pattern: string, name: closure] {
  if not ($dir | path exists) {
    return []
  }
  ls $dir | get name | each { |f| $f | path basename } | where { |b| $b =~ $pattern } | each { |b| do $name $b }
}

# rem undoes an add and sync replays one, so their plans hold only what was added here, as pack's remove and sync hold
# only what is installed: the rest of what the host's config names is add's
def virtPlanAdded [entries: list, root: string = '/'] {
  $entries
    | each { |e| $e | update instances ($e.instances | where { |i| virtInstanceHere $e.manager $i $root }) }
    | where { |e| $e.instances | is-not-empty }
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
  let managed = ($plan | transpose manager instances | where { |e| virtManagerHere $e.manager })

  if ($managed | is-empty) {
    let missing = ($plan | transpose manager instances | each { |e| $e.manager })
    if ($missing | is-not-empty) {
      opPrintWarn $"manager not installed: ($missing | str join ', ')"
    }
    return
  }

  if $env.VIRT_OP? in ['add' 'sync'] {
    virtQemuFitRun
  }

  # list's instances are its terms, not names: they go to virtListPlanRun, which finds what they match first
  if $env.VIRT_OP? == 'list' and ($managed | any { |e| $e.instances | is-not-empty }) {
    virtListPlanRun $managed
    return
  }

  let here = if $env.VIRT_OP? in ['rem' 'sync'] { virtPlanAdded $managed } else { $managed }
  if ($here | is-empty) {
    opPrintWarn $"instance not added: ($managed | each { |e| $e.instances } | flatten | str join ', ')"
    return
  }

  # one row per instance: removing a vm is destructive and they are independent of each other, so the
  # choice has to reach a single one. an empty instance list is not none, it is every one the manager
  # has, which only the manager can name — so it collapses to one row that stands for all of them
  let rows = ($here | each { |e|
    if ($e.instances | is-empty) {
      [{manager: $e.manager, instance: 'all', every: true}]
    } else {
      $e.instances | each { |i| {manager: $e.manager, instance: $i, every: false} }
    }
  } | flatten)

  virtTable ['manager' 'instance'] ($rows | enumerate | each { |r|
    [$"($r.index + 1)\) ($r.item.manager)", $r.item.instance]
  })
  let picked = (wutSelectRead ($rows | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $rows | get ($i - 1) })

  $env.VIRT_AGREED = '1'
  for manager in ($chosen | each { |r| $r.manager } | uniq) {
    let own = ($chosen | where manager == $manager)
    load-env {
      VIRT_MANAGER: $manager,
      VIRT_INSTANCES: (if ($own | any { |r| $r.every }) { [] } else { $own | each { |r| $r.instance } }),
    }
    virtCallManager $manager
    hide-env VIRT_MANAGER
  }

  # only the exceptions, after everything else had its turn: one instance failing does not stop the next
  let failed = ($env.VIRT_FAILED? | default [])
  if ($failed | is-not-empty) {
    opPrintErr 'failed:'
    for f in $failed { opPrintErr $"  ($f)" }
    exit 1
  }
}

# list with a term reads before it asks, as pack's does: which instances a manager has that match is a local question,
# so the summary names them under it and the table counts them. offering the terms as rows read as every manager
# holding an instance by that name, and picking one of two terms quietly dropped the other from the match. a picked
# manager is handed the terms unchanged, so its dump narrows by the same rule the summary answered by
def --env virtListPlanRun [managed: list] {
  let terms = ($managed | first | get instances)
  let found = ($managed
    | each { |e| {manager: $e.manager, instances: (virtListed $e.manager $terms)} }
    | where { |e| $e.instances | is-not-empty })
  if ($found | is-empty) {
    opPrintWarn $"no instance matches: ($terms | str join ' ')"
    return
  }

  for e in $found {
    opPrint $e.manager
    for i in $e.instances {
      opPrint $"  ($i)"
    }
  }
  opPrint ''
  virtTable ['manager' 'matches'] ($found | enumerate | each { |r|
    [$"($r.index + 1)\) ($r.item.manager)", ($r.item.instances | length | into string)]
  })
  let picked = (wutSelectRead ($found | length))
  if $picked == null {
    return
  }

  $env.VIRT_AGREED = '1'
  for i in $picked {
    let manager = ($found | get ($i - 1) | get manager)
    load-env {VIRT_MANAGER: $manager, VIRT_INSTANCES: $terms}
    virtCallManager $manager
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

