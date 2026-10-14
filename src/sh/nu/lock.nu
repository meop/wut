# one run of a command at a time on a machine; see docs/OPS.md (One run of a command at a time)

def wutLockPath [name: string] {
  $env.WUT_HOME? | default ($nu.home-dir | path join '.wut') | path join 'lock' $name
}

def wutLockEnvKey [name: string] {
  $"WUT_LOCK_($name | str uppercase)"
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

def wutLockHolder [dir: string] {
  try { open --raw ($dir | path join 'pid') | str trim } catch { |e| opRethrowInterrupt $e; '' }
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

# true once this run holds the lock, false when the run that started this one already does
def --env wutLockTake [name: string] {
  let dir = (wutLockPath $name)
  let key = (wutLockEnvKey $name)
  let inherited = ($env | get -o $key | default '')
  if $inherited != '' and (wutLockHolder $dir) == $inherited {
    let pid = ($inherited | split row ' ' | first | into int)
    if (wutLockStamp $pid) == $inherited {
      return false
    }
  }

  let own = (wutLockStamp $nu.pid)
  for attempt in 1..50 {
    if (wutLockMake $dir) {
      $own | save --force ($dir | path join 'pid')
      load-env { $key: $own }
      return true
    }
    let held = (wutLockHolder $dir)
    if $held == '' {
      let made = (try { ls --directory $dir | first | get modified } catch { |e| opRethrowInterrupt $e; date now })
      if ((date now) - $made) < 5sec {
        sleep 100ms
        continue
      }
    } else {
      let pid = (try { $held | split row ' ' | first | into int } catch { |e| opRethrowInterrupt $e; -1 })
      if $pid >= 0 and (wutLockStamp $pid) == $held {
        opPrintErr $"wut ($name) is already running here as pid ($pid): wait for it to end, or stop it"
        exit 1
      }
    }
    if (wutLockHolder $dir) == $held {
      rm --recursive --force $dir
    }
  }
  opPrintErr $"could not take the wut ($name) lock: ($dir)"
  exit 1
}

def --env wutLockDrop [name: string] {
  let dir = (wutLockPath $name)
  let key = (wutLockEnvKey $name)
  if (wutLockHolder $dir) == ($env | get -o $key) {
    rm --recursive --force $dir
  }
  hide-env -i $key
}

def --env wutLockRun [name: string, work: closure] {
  if not (wutLockTake $name) {
    do --env $work
    return
  }
  try {
    do --env $work
  } catch { |e|
    wutLockDrop $name
    opRethrowInterrupt $e
    $e.raw
  }
  wutLockDrop $name
}
