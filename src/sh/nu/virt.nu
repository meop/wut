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

# whether a unit starts at boot, and whether it runs now
def virtUnitState [unit: string] {
  {
    enabled: ((^systemctl is-enabled $unit | complete | get stdout | str trim) == 'enabled'),
    active: ((^systemctl is-active $unit | complete | get stdout | str trim) == 'active'),
  }
}

# add's --off: a new instance is left stopped and is not started at boot
def virtAddOff [] {
  ($env.VIRT_OFF? | default '') == '1'
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

  let here = if $env.VIRT_OP? in ['off' 'on' 'rem' 'sync' 'snap' 'unsnap' 'roll' 'unroll'] { virtPlanAdded $managed } else { $managed }
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
    if $env.VIRT_OP? in ['snap' 'unsnap' 'roll' 'unroll'] {
      virtSnapRun $manager
    } else {
      virtCallManager $manager
    }
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


# what an instance owns is one btrfs subvolume, and its snapshots sit beside it on the same filesystem, in back/<tier>,
# named as btrbk names them: <manager>-<instance>-<live|full>.<timestamp>. btrbk keeps the timed tiers, daily and
# weekly, and copies them to the other disk; manual and roll are wut's, and nothing rotates manual
const VIRT_SNAP_LOCK = '/run/lock/btrbk.lock'

# the instance's environment as its add merges it: the manager's yaml, then its own; podman's comes from the server
def virtSnapEnv [manager: string, name: string] {
  let entries = if $manager == 'podman' {
    $env.VIRT_PODMAN_ENV? | default '{}' | from json | transpose key value
  } else {
    let fetch = { |path| opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($path).yaml'#" | from yaml | get -o environment | default [] }
    (do $fetch $manager) ++ (do $fetch $"($env.SYS_HOST)/($manager)/($name)")
      | each { |e| let kv = ($e | split row '='); {key: $kv.0, value: ($kv | skip 1 | str join '=')} }
  }
  $entries | reduce --fold {} { |kv, acc| $acc | upsert $kv.key $kv.value }
}

# the subvolume an instance owns, the unit that runs it, and where its snapshots go; null when it keeps none
def virtSnapTarget [manager: string, instance: string] {
  let name = ($instance | split row '/' | first)
  let vars = (virtSnapEnv $manager $name)
  let found = match $manager {
    lxc => {subvol: $"($vars | get -o virt_lxc_dir_path | default '/var/lib/lxc')/($name)/rootfs", unit: $"lxc@($name)"},
    qemu => {subvol: $"($vars | get -o virt_qemu_dir_path | default '/virt/qemu')/($name)", unit: $"qemu-($name)"},
    podman => (if 'virt_podman_dir_path' in $vars { {subvol: $"($vars.virt_podman_dir_path)/($env.SYS_HOST)/($name)", unit: $"($name).service"} }),
    _ => null,
  }
  if $found == null {
    opPrintWarn $"`($manager)` instance `($name)` keeps no folder of its own to snapshot"
    return null
  }
  # a subvolume's root is inode 256
  let onBtrfs = (^sudo stat --file-system --format %T $found.subvol | complete | get stdout | str trim) == 'btrfs'
  if not ($onBtrfs and (^sudo stat --format %i $found.subvol | complete | get stdout | str trim) == '256') {
    opPrintWarn $"`($manager)` instance `($name)` is not a btrfs subvolume: ($found.subvol)"
    return null
  }
  let mount = (^sudo findmnt --noheadings --output TARGET --target $found.subvol | str trim)
  $found | insert name $name | insert back ($mount | path join 'back') | insert prefix $"($manager)-($name)"
}

# the instance's snapshots in those tiers, oldest first; the name is matched whole, so alma never finds alma-test's
def virtSnapList [target: record, tiers: list<string>] {
  let pattern = $"^($target.prefix)-\(live|full\)\\.\\d{8}T\\d{4}\(_\\d+\)?$"
  $tiers | each { |tier|
    let dir = ($target.back | path join $tier)
    ^sudo find $dir -mindepth 1 -maxdepth 1 -type d | complete | get stdout | lines
      | each { |p| $p | path basename }
      | where { |n| $n =~ $pattern }
      | each { |n| {tier: $tier, name: $n, path: ($dir | path join $n), ts: ($n | split row '.' | last)} }
  } | flatten | sort-by ts
}

# a new snapshot's name: btrbk's timestamp, and _N when one already has it
def virtSnapName [dir: string, base: string] {
  let ts = (date now | format date '%Y%m%dT%H%M')
  mut name = $"($base).($ts)"
  mut n = 1
  while ((^sudo test -e ($dir | path join $name) | complete).exit_code == 0) {
    $name = $"($base).($ts)_($n)"
    $n += 1
  }
  $name
}

# a snapshot named in full, or by its timestamp
def virtSnapPick [snaps: list, to: string] {
  $snaps | where { |s| $s.name == $to or $s.ts == $to }
}

def --env virtSnapFail [what: string] {
  $env.VIRT_FAILED = ($env.VIRT_FAILED? | default []) | append $what
}

# steps that swap an instance's subvolume, under btrbk's lock, so a timed run never snapshots half a swap
def virtSnapSwap [steps: list<string>] {
  opPrintMaybeRunCmd sudo flock --nonblock $VIRT_SNAP_LOCK sh -c $"r#'($steps | str join ' && ')'#"
}

def --env virtSnapOne [manager: string, target: record] {
  let tier = ($env.VIRT_SNAP_TIER? | default 'manual')
  let full = ($env.VIRT_SNAP_FULL? | default '') == '1'
  let conf = $"/etc/btrbk/($tier).conf"
  if $tier != 'manual' and not ($conf | path exists) {
    opPrintWarn $"no btrbk tier ($tier): ($conf) does not exist"
    return
  }
  let stop = $full and (virtUnitState $target.unit).active
  if $stop {
    opPrintMaybeRunCmd sudo systemctl stop $target.unit
  }
  try {
    if $tier == 'manual' {
      let dir = ($target.back | path join 'manual')
      opPrintMaybeRunCmd sudo mkdir -p $dir
      let name = (virtSnapName $dir $"($target.prefix)-(if $full { 'full' } else { 'live' })")
      opPrintMaybeRunCmd sudo btrfs subvolume snapshot -r $target.subvol ($dir | path join $name)
    } else {
      opPrintMaybeRunCmd sudo btrbk -c $conf snapshot $target.subvol
    }
  } catch { |e|
    opRethrowInterrupt $e
    virtSnapFail $"snap ($manager) ($target.name)"
  }
  if $stop {
    opPrintMaybeRunCmd sudo systemctl start $target.unit
  }
  # the copy to the other disk, once the instance is back
  if $tier != 'manual' {
    try {
      opPrintMaybeRunCmd sudo btrbk -c $conf resume $target.subvol
    } catch { |e|
      opRethrowInterrupt $e
      virtSnapFail $"copy ($manager) ($target.name)"
    }
  }
}

def --env virtUnsnapOne [manager: string, target: record] {
  let snaps = (virtSnapList $target ['manual'])
  let to = ($env.VIRT_SNAP_TO? | default '')
  let picked = if $to != '' {
    virtSnapPick $snaps $to
  } else if ($snaps | is-not-empty) {
    virtTable ['snapshot'] ($snaps | enumerate | each { |s| [$"($s.index + 1)\) ($s.item.name)"] })
    let chosen = (wutSelectRead ($snaps | length))
    if $chosen == null { [] } else { $chosen | each { |i| $snaps | get ($i - 1) } }
  } else {
    []
  }
  if ($picked | is-empty) {
    opPrintWarn $"no manual snapshot of `($manager)` instance `($target.name)`(if $to != '' { $' named ($to)' } else { '' })"
    return
  }
  for s in $picked {
    opPrintMaybeRunCmd sudo btrfs subvolume delete $s.path
  }
}

def --env virtRollOne [manager: string, target: record] {
  let snaps = (virtSnapList $target ['daily' 'weekly' 'manual'])
  let to = ($env.VIRT_SNAP_TO? | default '')
  let picked = if $to != '' { virtSnapPick $snaps $to } else { $snaps | last 1 }
  if ($picked | is-empty) {
    opPrintWarn $"no snapshot of `($manager)` instance `($target.name)` to roll back to(if $to != '' { $' named ($to)' } else { '' })"
    return
  }
  if ($picked | length) > 1 {
    opPrintWarn $"($to) names more than one snapshot, give one in full: ($picked | each { |s| $s.name } | str join ', ')"
    return
  }
  let chosen = ($picked | first)
  let running = (virtUnitState $target.unit).active
  let rollDir = ($target.back | path join 'roll')
  let previous = (virtSnapList $target ['roll'])
  let keep = ($rollDir | path join (virtSnapName $rollDir $"($target.prefix)-full"))
  opPrintInfo $"  back to: ($chosen.path)"
  let replaces = if ($previous | is-not-empty) { $", in place of ($previous | each { |p| $p.name } | str join ', ')" } else { '' }
  opPrintInfo $"  its current state kept as: ($keep)($replaces)"
  if $running {
    opPrintInfo $"  ($target.unit) is running, so it stops first and starts after"
  }
  if not (opAsk $"roll - ($manager) ($target.name) - back to ($chosen.name)") {
    return
  }
  if $running {
    opPrintMaybeRunCmd sudo systemctl stop $target.unit
  }
  try {
    virtSnapSwap ([
      ($previous | each { |p| $"btrfs subvolume delete ($p.path)" }),
      [
        $"mkdir -p ($rollDir)",
        $"btrfs subvolume snapshot -r ($target.subvol) ($keep)",
        $"btrfs subvolume delete ($target.subvol)",
        $"btrfs subvolume snapshot ($chosen.path) ($target.subvol)",
      ],
    ] | flatten)
  } catch { |e|
    opRethrowInterrupt $e
    virtSnapFail $"roll ($manager) ($target.name)"
  }
  if $running {
    opPrintMaybeRunCmd sudo systemctl start $target.unit
  }
}

def --env virtUnrollOne [manager: string, target: record] {
  let kept = (virtSnapList $target ['roll'])
  if ($kept | is-empty) {
    opPrintWarn $"no roll of `($manager)` instance `($target.name)` to undo"
    return
  }
  let last = ($kept | last)
  let running = (virtUnitState $target.unit).active
  opPrintInfo $"  back to its state before the last roll: ($last.path)"
  if $running {
    opPrintInfo $"  ($target.unit) is running, so it stops first and starts after"
  }
  if not (opAsk $"unroll - ($manager) ($target.name) - back to before the last roll") {
    return
  }
  if $running {
    opPrintMaybeRunCmd sudo systemctl stop $target.unit
  }
  try {
    virtSnapSwap [
      $"btrfs subvolume delete ($target.subvol)",
      $"btrfs subvolume snapshot ($last.path) ($target.subvol)",
      $"btrfs subvolume delete ($last.path)",
    ]
  } catch { |e|
    opRethrowInterrupt $e
    virtSnapFail $"unroll ($manager) ($target.name)"
  }
  if $running {
    opPrintMaybeRunCmd sudo systemctl start $target.unit
  }
}

def --env virtSnapRun [manager: string] {
  # a pod is one subvolume however many of its instances were named
  for instance in ($env.VIRT_INSTANCES | each { |i| $i | split row '/' | first } | uniq) {
    let target = (virtSnapTarget $manager $instance)
    if $target == null {
      continue
    }
    match $env.VIRT_OP {
      snap => { virtSnapOne $manager $target }
      unsnap => { virtUnsnapOne $manager $target }
      roll => { virtRollOne $manager $target }
      unroll => { virtUnrollOne $manager $target }
    }
  }
}
