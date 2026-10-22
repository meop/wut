# rv is ruby's uv: it installs rubies, and gems as tools, each in an environment of its own under its tools dir
# (`<gem>@<version>`). nothing is put on PATH: a tool is run through rvx, which starts it on rv's own ruby, so no
# ruby PATH finds can take it over. on windows `rv` is also powershell's alias for Remove-Variable, which is why rv
# calls itself rvw there; nu calls rv.exe itself, so neither is in its way
def --env packRvTools [] {
  let res = (packAsk [rv tool list --format json])
  if $res.exit_code != 0 {
    return []
  }
  $res.stdout | from json | each { |t| { name: $t.gem_name, version: $t.version } }
}

def --env packRvInstalled [] {
  packListedNames [rv tool list --format json] { |line| $line }
    | str join ''
    | try { from json | get gem_name | uniq } catch { |e| opRethrowInterrupt $e; [] }
}

# rvx comes beside rv, and is the only way a tool runs
def --env packRvHeld [] {
  let rv = (which rv | get -o 0.path)
  let ext = if $nu.os-info.name == 'windows' { '.exe' } else { '' }
  if not ($rv | path dirname | path join $"rvx($ext)" | path exists) {
    return (packHeld '' 'no rvx beside rv, so its tools cannot run' [$"rv ($rv)"])
  }
  let res = (packAsk [rv ruby list --installed-only --format json])
  let rubies = if $res.exit_code == 0 {
    $res.stdout | from json | each { |r| $r.Installed?.version? } | compact | each { |v| packVersionOf $v }
  } else { [] }
  packHeld (if ($rubies | is-empty) { '' } else { $"ruby ($rubies | sort | str join ', ')" })
}

# rv keeps every version a tool was installed at, has no upgrade, and its uninstall takes a gem whole: an update
# installs the latest beside what is there, and where that leaves more than one version, the tool is put back at the
# latest alone, from rv's cache
def --env packRvUpdate [names: list<string>] {
  for n in $names {
    packOp [rv tool install $n]
  }
  if 'NOOP' in $env {
    return
  }
  let held = (packRvTools)
  for n in $names {
    if ($held | where name == $n | length) > 1 {
      packOp [rv tool uninstall $n]
      packOp [rv tool install $n]
    }
  }
}

def --env packRv [] {
  let cmd = 'rv'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd tool install] --each
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    remove => {
      packOpRemove [$cmd tool uninstall] --each
    }
    sync => {
      let asked = (packNameList 'PACK_SYNC_NAMES')
      # the newest ruby goes in first, the way uv moves its pythons before the tools
      if ($asked | is-empty) {
        packOp [$cmd ruby install latest]
      }
      packRvUpdate (if ($asked | is-empty) { packRvTools | get name | uniq } else { packSyncNames })
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
