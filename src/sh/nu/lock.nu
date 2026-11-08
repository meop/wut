# one lock for the whole machine, held by whatever is about to change it; see docs/OPS.md (One host lock)

def wutLockPath [] {
  $env.WUT_HOME? | default ($nu.home-dir | path join '.wut') | path join 'lock' 'host'
}

# a pid and when it started, so a pid handed on to another process since is not taken for the holder
def wutLockStamp [pid: int] {
  let found = (ps --long | where pid == $pid)
  if ($found | is-empty) {
    return ''
  }
  let started = ($found | first | get -o start_time)
  if $started == null { $"($pid)" } else { $"($pid) ($started | format date '%s')" }
}

def wutLockRead [dir: string, file: string] {
  try { open --raw ($dir | path join $file) | str trim } catch { |e| opRethrowInterrupt $e; '' }
}

def wutLockHolderPid [held: string] {
  try { $held | split row ' ' | first | into int } catch { |e| opRethrowInterrupt $e; -1 }
}

# the os's own mkdir, which fails when the dir is already there; nu's is mkdir -p
def wutLockMake [dir: string] {
  let parent = ($dir | path dirname)
  mkdir $parent
  let made = if $nu.os-info.name == 'windows' {
    do { cd $parent; ^cmd /c mkdir ($dir | path basename) } | complete
  } else {
    do { ^mkdir $dir } | complete
  }
  $made.exit_code == 0
}

# this process and every one it descends from
def wutLockLineage [] {
  let procs = (ps | select pid ppid)
  mut line = [$nu.pid]
  mut at = $nu.pid
  for _ in 1..64 {
    let up = ($procs | where pid == $at | get -o 0.ppid)
    if $up == null or $up <= 0 or $up in $line {
      break
    }
    $line = ($line | append $up)
    $at = $up
  }
  $line
}

# the lock is this run's when this process or one it descends from holds it: the stamp it hands down through
# WUT_LOCK_HOST, or failing that its pid in this one's lineage, since sudo, su and a service start a child without
# that environment
def wutLockMine [dir: string] {
  let held = (wutLockRead $dir 'pid')
  let pid = (wutLockHolderPid $held)
  if $pid < 0 or (wutLockStamp $pid) != $held {
    return false
  }
  ($env.WUT_LOCK_HOST? | default '') == $held or $pid in (wutLockLineage)
}

# where a run is about to change the machine: takes the host lock, waiting for whoever holds it, and says once who
# that is. outside a wutLockScope it does nothing, so a reading op that shares a runner with a changing one takes none
def --env wutLockHold [] {
  let what = ($env.WUT_LOCK_SCOPE? | default '')
  if $what == '' {
    return
  }
  let dir = (wutLockPath)
  if (wutLockMine $dir) {
    return
  }
  let own = (wutLockStamp $nu.pid)
  mut told = false
  loop {
    if (wutLockMake $dir) {
      $what | save --force ($dir | path join 'what')
      $own | save --force ($dir | path join 'pid')
      load-env {WUT_LOCK_HOST: $own}
      return
    }
    let held = (wutLockRead $dir 'pid')
    if $held == '' {
      let made = (try { ls --directory $dir | first | get modified } catch { |e| opRethrowInterrupt $e; date now })
      if ((date now) - $made) < 5sec {
        sleep 100ms
        continue
      }
    } else {
      let pid = (wutLockHolderPid $held)
      if $pid >= 0 and (wutLockStamp $pid) == $held {
        if not $told {
          opPrintInfo $"waiting for `wut (wutLockRead $dir 'what')` \(pid ($pid)\) to finish changing this host"
          $told = true
        }
        sleep 250ms
        continue
      }
    }
    if (wutLockRead $dir 'pid') == $held {
      rm --recursive --force $dir
    }
  }
}

# a run that may change the machine runs inside this: what wutLockHold takes in it is given back when it ends,
# however it ends. what: the command a waiting run names, `pack sync`
def --env wutLockScope [what: string, work: closure] {
  let dir = (wutLockPath)
  let had = (wutLockMine $dir)
  let outer = ($env.WUT_LOCK_SCOPE? | default '')
  $env.WUT_LOCK_SCOPE = (if $outer == '' { $what } else { $outer })
  let release = {||
    if not $had and (wutLockRead $dir 'pid') == (wutLockStamp $nu.pid) {
      rm --recursive --force $dir
    }
  }
  try {
    do --env $work
  } catch { |e|
    do $release
    opRethrowInterrupt $e
    $e.raw
  }
  do $release
  if $outer == '' {
    hide-env -i WUT_LOCK_SCOPE
  }
}
