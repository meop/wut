# uv's own pythons, one per install: the listing names each again for every link to it
def --env packUvPythons [] {
  let res = (packAsk [uv python list --only-installed --managed-python --output-format json])
  if $res.exit_code != 0 {
    return []
  }
  $res.stdout | from json | uniq-by key
}

# where each tool's venv was made from: the home its pyvenv.cfg names
def --env packUvToolHomes [] {
  let dir = (packAsk [uv tool dir] | get stdout | str trim)
  if ($dir | is-empty) or not ($dir | path exists) {
    return []
  }
  ls $dir | where type == dir | each { |d|
    let cfg = ($d.name | path join pyvenv.cfg)
    let home = if ($cfg | path exists) {
      open --raw $cfg | lines | parse --regex '^home\s*=\s*(?<v>.+)$' | get -o 0.v | default '' | str trim
    } else { '' }
    { name: ($d.name | path basename), home: $home }
  }
}

# a tool is a venv made on one python. one made on a python uv does not manage — a distro's — is moved by that
# distro rather than by uv's python upgrade, and breaks when the distro moves its minor
def --env packUvHeld [] {
  let pythons = (packAsk [uv python dir] | get stdout | str trim)
  let off = (packUvToolHomes | where { |t| not (packUnder $t.home $pythons) })
  if ($off | is-not-empty) {
    let what = if ($off | length) == 1 { 'a tool runs' } else { 'tools run' }
    return (packHeld '' $"($what) on a python uv does not manage" [
      ...($off | each { |t| $"($t.name) ($t.home)" })
      $"uv tool install --reinstall --managed-python ($off | get name | str join ' ')"
    ])
  }
  let minors = (packUvPythons | each { |p| $"($p.version_parts.major).($p.version_parts.minor)" } | uniq | sort)
  packHeld (if ($minors | is-empty) { '' } else { $"python ($minors | str join ', ')" })
}

# uv python upgrade puts the newest patch of a minor beside the one it had and keeps the old: it is let go here, as
# every other manager lets a release go once a newer one is in place. a pre-release is never the older one, and a
# python a tool still runs on stays
def --env packUvPythonPrune [] {
  let dir = (packAsk [uv python dir] | get stdout | str trim)
  let homes = (packUvToolHomes | get home)
  let releases = (packUvPythons | where { |p| $p.version =~ '^\d+\.\d+\.\d+$' })
  let lines = ($releases | group-by { |p|
    [$p.implementation $p.version_parts.major $p.version_parts.minor $p.variant $p.os $p.arch $p.libc] | str join '-'
  } | values)
  for line in $lines {
    for p in ($line | sort-by { |p| $p.version_parts.patch } | drop 1) {
      let at = ($dir | path join $p.key)
      if ($homes | any { |h| packUnder $h $at }) {
        continue
      }
      packOp [uv python uninstall $p.key]
    }
  }
}

# the newest stable minor uv has for this machine, installed or not: what a bare sync moves to. asked of the downloads
# list rather than of what is installed, so a dry run plans what the sync will do
def --env packUvNewestMinor [] {
  let res = (packAsk [uv python list --output-format json])
  if $res.exit_code != 0 {
    return null
  }
  let newest = ($res.stdout | from json | default []
    | where { |p| $p.implementation == 'cpython' and $p.variant == 'default' and $p.version =~ '^\d+\.\d+\.\d+$' }
    | sort-by { |p| $p.version_parts.major } { |p| $p.version_parts.minor }
    | last 1)
  if ($newest | is-empty) { null } else { $"($newest.0.version_parts.major).($newest.0.version_parts.minor)" }
}

def --env packUv [] {
  let cmd = 'uv'
  if (packSkip $cmd) {
    return
  }


  # uv doesn't expose a per-tool info command, but each tool is just an
  # isolated venv under `uv tool dir`/<name> (undocumented as a stable path,
  # but real and inspectable — the same pip metadata `uv pip show` reads
  # anywhere else) with a standard venv layout, so pointing pip show at that
  # tool's own interpreter reports on exactly what's actually installed.
  def getToolPython [name: string] {
    let dir = [(^$cmd tool dir | str trim) $name] | path join
    if $nu.os-info.name == windows {
      [$dir Scripts python.exe] | path join
    } else {
      [$dir bin python] | path join
    }
  }

  match $env.PACK_OP {
    add => {
      # on a python uv manages, never a distro's that would move under the tool: see packUvHeld
      packOpAdd [$cmd tool install --managed-python] --each
    }
    info => {
      for term in (packInfoNames) {
        let python = (getToolPython $term)
        if ($python | path exists) {
          packOp [$cmd pip show --python $python $term]
        } else {
          packPypiInfo $term
        }
      }
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    remove => {
      packOpRemove [$cmd tool uninstall]
    }
    sync => {
      # uv manages pythons as well as tools, and a bare sync moves both to the latest, as rustup's stable and rv's
      # latest do. `python upgrade` only moves each minor to its newest patch, and a bare `python install` is done
      # once any python is in, so the newest minor comes in through `install --upgrade`, taking the python and
      # python3 links with it (--default). the tools then move onto it: a tool's venv is made on one python and stays
      # there through `tool upgrade` unless it is given another. a machine with no python of uv's is left without one
      let newest = (packUvNewestMinor)
      let upgrade = if $newest == null { [] } else { [--managed-python --python $newest] }
      if ((packNameList 'PACK_SYNC_NAMES') | is-empty) {
        packOp [$cmd python upgrade]
        if (packUvPythons | is-not-empty) {
          packOp [$cmd python install --upgrade --default]
        }
      }
      packOpSync [$cmd tool upgrade --all ...$upgrade] [$cmd tool upgrade ...$upgrade]
      if ((packNameList 'PACK_SYNC_NAMES') | is-empty) {
        packUvPythonPrune
      }
    }
    tidy => {
      packUvPythonPrune
      packOp [$cmd cache clean]
    }
  }
}
