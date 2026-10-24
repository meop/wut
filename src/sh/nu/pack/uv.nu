# uv's own pythons as uv lists them: each install, then again for every link to it, under the install's key
def --env packUvListing [] {
  let res = (packAsk [uv python list --only-installed --managed-python --output-format json])
  if $res.exit_code != 0 {
    return []
  }
  $res.stdout | from json
}

# uv's own pythons, one per install
def --env packUvPythons [] {
  packUvListing | uniq-by key
}

# the links uv keeps in its bin dir, each a pin the way a ghpm name is: `python` follows the newest python there is,
# `python3` the newest 3, `python3.14` the newest 3.14, and one naming a patch stays on it (python.exe and the rest on
# windows). uv lists each under the install it reaches, and a link it does not own is not listed at all
def --env packUvLinks [listing: list<any>] {
  let bin = (packAsk [uv python dir --bin] | get stdout | str trim)
  if ($bin | is-empty) {
    return []
  }
  let at = ($bin | path expand)
  $listing | where { |p| ($p.path | path dirname | path expand) == $at } | each { |p|
    let name = ($p.path | path basename)
    let m = ($name | parse --regex '^python(?<pin>\d+(?:\.\d+){0,2})?(?:\.exe)?$' | get -o 0)
    if $m == null {
      null
    } else {
      let pin = ($m.pin | default '' | split row '.' | where { |s| $s | is-not-empty } | into int)
      { name: $name, pin: $pin, key: $p.key, version: $p.version_parts }
    }
  } | compact
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

# a python uv holds is let go once nothing links to it, the way ghpm lets go of a release no pin is on. its links are
# the ones in uv's bin dir and the minor's own beside it in uv's python dir (cpython-3.14-...), which a venv uv made
# runs through, so a patch `python upgrade` moved past is left with none. what a project's venv or a tool rests on is
# not otherwise known, so a python that still has a link stays, however old: uv uninstalls it by hand
def --env packUvPythonTidy [] {
  let dir = (packAsk [uv python dir] | get stdout | str trim | path expand --no-symlink)
  let listing = (packUvListing)
  let linked = ($listing | where { |p|
    not ($p.path | path expand --no-symlink | str starts-with (($dir | path join $p.key) + (char path_sep)))
  } | get key)
  for p in ($listing | uniq-by key | where { |p| $p.key not-in $linked }) {
    packOp [uv python uninstall $p.key]
  }
}

# the stable cpythons uv could install for this machine, installed or not: what each link may move to. asked of the
# downloads list rather than of what is installed, so a dry run plans what the sync will do
def --env packUvReleases [] {
  let res = (packAsk [uv python list --output-format json])
  if $res.exit_code != 0 {
    return []
  }
  $res.stdout | from json | default []
    | where { |p| $p.implementation == 'cpython' and $p.variant == 'default' and $p.version =~ '^\d+\.\d+\.\d+$' }
    | get version_parts
}

def packUvOrder [v: record] {
  [$v.major $v.minor $v.patch] | each { |n| $n | fill --alignment right --character '0' --width 6 } | str join
}

# the newest release a pin allows, where it is newer than the one the link reaches now
def packUvAhead [releases: list<any>, link: record] {
  let newest = ($releases
    | where { |v| $link.pin | enumerate | all { |e| ([$v.major $v.minor $v.patch] | get $e.index) == $e.item } }
    | sort-by { |v| packUvOrder $v } | last 1 | get -o 0)
  if $newest != null and (packUvOrder $newest) > (packUvOrder $link.version) { $newest } else { null }
}

# the minor the bare python link reaches now, or null where there is none
def --env packUvTopMinor [] {
  let top = (packUvLinks (packUvListing) | where { |l| $l.pin | is-empty } | get -o 0)
  if $top == null { null } else { $"($top.version.major).($top.version.minor)" }
}

# each link in uv's bin dir moved to the newest release its pin allows. `python upgrade` moves each installed minor to
# its newest patch and the pythonX.Y links with it. a pythonX link moves only through `install --default`, which takes
# the bare python link along, so a major below the newest moves first and the bare link is set last, back onto the
# newest of all. --default makes the two together, so a pythonX with no bare link is one taken apart by hand, and is
# left. the minor the bare link ends on is returned for the tools to move to, or null where there is none
def --env packUvMoveLinks [] {
  packOp [uv python upgrade]
  let links = (packUvLinks (packUvListing))
  if ($links | is-empty) {
    return null
  }
  let releases = (packUvReleases)
  let top = ($links | where { |l| $l.pin | is-empty } | get -o 0)
  let majors = ($links | where { |l| ($l.pin | length) == 1 } | each { |l|
    let to = (packUvAhead $releases $l)
    if $to == null { null } else { $l | insert to $to }
  } | compact | sort-by { |l| $l.to.major })
  if $top == null {
    return null
  }
  let topTo = (packUvAhead $releases $top | default $top.version)
  for l in ($majors | where { |l| $l.to.major != $topTo.major }) {
    packOp [uv python install --default $"($l.to.major).($l.to.minor)"]
  }
  if ($majors | is-not-empty) or (packUvOrder $topTo) != (packUvOrder $top.version) {
    packOp [uv python install --default $"($topTo.major).($topTo.minor)"]
  }
  $"($topTo.major).($topTo.minor)"
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
      # uv manages pythons as well as tools, and each link in its bin dir is a pin a bare sync moves along: see
      # packUvMoveLinks. a machine with no python of uv's is not given one. the tools then move to the minor the bare
      # python link names: a tool's venv is made on one python and stays there through `tool upgrade` unless it is
      # given another. with no bare link they upgrade where they are. the pythons left behind are tidy's
      let bare = ((packNameList 'PACK_SYNC_NAMES') | is-empty)
      let minor = if $bare { packUvMoveLinks } else { packUvTopMinor }
      let upgrade = if $minor == null { [] } else { [--managed-python --python $minor] }
      packOpSync [$cmd tool upgrade --all ...$upgrade] [$cmd tool upgrade ...$upgrade]
    }
    tidy => {
      packUvPythonTidy
      packOp [$cmd cache clean]
    }
  }
}
