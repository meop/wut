def replaceEnv [line] {
  mut l = $line
  if ($l | str contains '{') {
    let itemsEnv = $env | items { |key, value| [$key, $value] }
    for e in ($itemsEnv | where { |e| (($e.0 | describe) == string) and (($e.1 | describe) == string) }) {
      $l = $l | str replace --all $"{($e.0)}" ($e.1)
    }
  }
  return $l
}

# a tool's key is the bin to look for: a config for something not installed is skipped rather than written
def fileBinHere [tool: string] {
  which $tool | is-not-empty
}

# one field of a plan entry, which is the key and then its parts, joined by |
def fileField [entry: string, i: int] {
  $entry | split row '|' | get $i
}

def fileDst [raw: string] {
  replaceEnv $raw | path expand
}

def fileOf [entries: list, tool: string] {
  $entries | where { |e| (fileField $e 0) == $tool }
}

# remove takes back what is on disk, whether or not the tool still is: a pack removes a tool's files before the tool
def fileToolHere [tool: string, pairs: list] {
  if $env.FILE_OP? == 'remove' {
    fileOf $pairs $tool | any { |p| fileDst (fileField $p 2) | path exists }
  } else {
    fileBinHere $tool
  }
}

# the plan for the ops that act: which tools are here, each with the files it would write or remove, then a row per
# tool to pick. outdated fetches every source sync would, so it is gated the same
def filePlanShow [pairsKey: string, dirsKey: string, toolsKey: string] {
  let pairs = ($env | get -o $pairsKey | default [])
  let tools = ($pairs | each { |p| fileField $p 0 } | uniq | sort | where { |t| fileToolHere $t $pairs })
  if ($tools | is-empty) {
    opPrintWarn (if $env.FILE_OP == 'remove' { 'nothing to remove' } else { 'no tool here has files' })
    return false
  }
  for t in $tools {
    opPrint $t
    for p in (fileOf $pairs $t) {
      let dst = (fileDst (fileField $p 2))
      if $env.FILE_OP != 'remove' or ($dst | path exists) {
        opPrint $"  ($dst)"
      }
    }
  }
  opPrint ''
  wutTable ['tool'] ($tools | enumerate | each { |t| [$"($t.index + 1)\) ($t.item)"] })
  let picked = (wutSelectRead ($tools | length))
  if $picked == null {
    return false
  }
  load-env {($toolsKey): ($picked | each { |i| $tools | get ($i - 1) })}
  true
}

def fileFetch [src: string] {
  let srcUrl = $"($env.REQ_URL_CFG)/file/($src | str trim --left --char '/')"
  opPrintCmd http get --raw --redirect-mode follow $"r#'($srcUrl)'#"
  http get --raw --redirect-mode follow $srcUrl
}

# what writing a source would do to its destination: nothing, a new file, or a changed one, by their bytes
def fileState [content, dst: string] {
  if not ($dst | path exists) {
    'new'
  } else if (open --raw $dst | hash sha256) == ($content | hash sha256) {
    'same'
  } else {
    'changed'
  }
}

# files in a folder map's destination that its source no longer has: a sync takes them out, so the folder is the
# source's, without clearing and writing all of it again
def fileStray [tool: string, pairs: list, dirs: list] {
  let wanted = (fileOf $pairs $tool | each { |p| fileDst (fileField $p 2) })
  fileOf $dirs $tool | each { |d| fileDst (fileField $d 1) } | where { |d| $d | path exists } | each { |d|
    # from inside the dir, so a windows path's separators are never read as a pattern's escapes
    do { cd $d; glob '**/*' --no-dir } | where { |f| $f not-in $wanted }
  } | flatten
}

# what a sync of one tool would change, said and not done: each file it would write, with the diff of a changed one,
# and each it would take out
def fileOutdatedTool [tool: string, pairs: list, dirs: list] {
  mut pending = 0
  for p in (fileOf $pairs $tool) {
    let dst = (fileDst (fileField $p 2))
    let content = (fileFetch (fileField $p 1))
    let state = (fileState $content $dst)
    if $state == 'same' {
      continue
    }
    $pending += 1
    opPrint $"  ($state): ($dst)"
    if $state == 'changed' {
      let tmp = (mktemp --suffix '.file.outdated.tmp' --tmpdir)
      $content | save --force --raw $tmp
      let diffCmd = if (which diff | is-not-empty) { 'diff' } else { 'fc' }
      run-external $diffCmd $dst $tmp | complete | get stdout | str trim --right | lines | each { |l| opPrint $"    ($l)" }
      rm --force $tmp
    }
  }
  for f in (fileStray $tool $pairs $dirs) {
    $pending += 1
    opPrint $"  stale: ($f)"
  }
  if $pending == 0 {
    opPrintInfo $"($tool): up to date"
  }
}

# a sync of one tool writes only what differs from its source, takes out what its folder maps no longer have, and
# sets permissions where it wrote, so a sync that changes nothing writes nothing
def --env fileSyncTool [tool: string, pairs: list, dirs: list, perms: list] {
  mut wrote = false
  mut same = 0
  for p in (fileOf $pairs $tool) {
    let dst = (fileDst (fileField $p 2))
    let content = (fileFetch (fileField $p 1))
    let state = (fileState $content $dst)
    if $state == 'same' {
      $same += 1
      continue
    }
    let parent = ($dst | path dirname)
    if not ($parent | path exists) {
      opPrintMaybeRunCmd mkdir $"r#'($parent)'#"
    }
    opPrintCmd save --force --raw $"r#'($dst)'#"
    if 'DRYRUN' not-in $env {
      $content | save --force --raw $dst
    }
    $wrote = true
  }
  for f in (fileStray $tool $pairs $dirs) {
    opPrintMaybeRunCmd rm --force --permanent $"r#'($f)'#"
    $wrote = true
  }
  if $wrote {
    for perm in (fileOf $perms $tool) {
      opPrintMaybeRunCmd ...(replaceEnv (fileField $perm 1) | split row ' ')
    }
  }
  if $same > 0 {
    opPrintInfo $"($tool): ($same) unchanged"
  }
}

# a remove of one tool takes out every folder map's destination whole, and each file it wrote elsewhere
def --env fileRemoveTool [tool: string, pairs: list, dirs: list] {
  let dirPaths = (fileOf $dirs $tool | each { |d| fileDst (fileField $d 1) })
  for d in ($dirPaths | where { |d| $d | path exists }) {
    opPrintMaybeRunCmd rm --force --permanent --recursive $"r#'($d)'#"
  }
  for p in (fileOf $pairs $tool) {
    let dst = (fileDst (fileField $p 2))
    if ($dirPaths | any { |d| $dst | str starts-with $"($d)(char path_sep)" }) or not ($dst | path exists) {
      continue
    }
    opPrintMaybeRunCmd rm --force --permanent $"r#'($dst)'#"
  }
}

def fileToolChosen [toolsKey: string, tool: string] {
  let chosen = ($env | get -o $toolsKey | default [])
  ($chosen | is-empty) or ($tool in $chosen)
}

def file [] {
  let op = $env.FILE_OP
  let key = ($op | str uppercase)
  let pairs = ($env | get -o $"FILE_($key)_PATH_PAIRS" | default [])
  let dirs = ($env | get -o $"FILE_($key)_DIRS" | default [])
  let perms = ($env | get -o $"FILE_($key)_PATH_PERMS" | default [])
  let tools = ($pairs | each { |p| fileField $p 0 } | uniq | sort | where { |t| fileToolChosen $"FILE_($key)_TOOLS" $t })
  match $op {
    find => {
      let here = (
        ($env.FILE_FIND_KEYS? | default []) | each { |entry| $entry | split row '|' }
          | where { |parts| fileBinHere ($parts | get 0) }
          | each { |parts| {
            bin: ($parts | get 0),
            ins: ($parts | get -o 1 | default ''),
          } }
      )
      for e in $here {
        opPrint $e.bin
        if ($e.ins | is-not-empty) {
          opPrint $"  ($e.ins)"
        }
      }
    }
    list => {
      # what is in place on this machine: each file a tool here has, where it is
      for t in ($tools | where { |t| fileBinHere $t }) {
        let present = (fileOf $pairs $t | each { |p| fileDst (fileField $p 2) } | where { |d| $d | path exists })
        if ($present | is-not-empty) {
          opPrint $t
          for d in $present {
            opPrint $"  ($d)"
          }
        }
      }
    }
    outdated => {
      for t in $tools {
        opPrint $t
        fileOutdatedTool $t $pairs $dirs
      }
    }
    sync => {
      wutLockHold
      for t in $tools {
        fileSyncTool $t $pairs $dirs $perms
      }
    }
    remove => {
      wutLockHold
      for t in $tools {
        fileRemoveTool $t $pairs $dirs
      }
    }
  }
}
