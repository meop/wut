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

# ghpm's table: a rule as wide as each header, columns padded to their widest cell, the last one loose
def fileTable [headers: list<string>, rows: list<list<string>>] {
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

def filePrompt [label: string] {
  mut yn = ''
  if YES in $env {
    $yn = 'y'
  } else {
    opPrint ''
    $yn = input $"($label) [y,[n]]: "
  }
  ($yn | str lowercase) in ['', 'y', 'yes']
}

# a tool's compound key doubles as its candidate bin names, same as the per-pair check the sync loop already does
def fileBinHere [tool: string] {
  $tool | split row ',' | any { |alias| which $alias | is-not-empty }
}

# diff, find, and list only read and print — nothing to agree to. sync is the one op that pushes files, so it is
# the one that plans: which tools are here, how many files each, and which destination dirs get cleared first
def filePlanShow [] {
  let pairs = ($env.FILE_SYNC_PATH_PAIRS? | default []) | where { |p| fileBinHere ($p | split row '|' | get 0) }
  let clearDirs = ($env.FILE_SYNC_CLEAR_DIRS? | default []) | where { |d| fileBinHere ($d | split row '|' | get 0) }
  if ($pairs | is-empty) and ($clearDirs | is-empty) {
    return true
  }

  let fileTools = ($pairs | each { |p| $p | split row '|' | get 0 })
  let dirTools = ($clearDirs | each { |d| $d | split row '|' | get 0 })
  let rows = (($fileTools ++ $dirTools) | uniq | sort | each { |t|
    [
      $t,
      ($fileTools | where { |x| $x == $t } | length | into string),
      ($dirTools | where { |x| $x == $t } | length | into string),
    ]
  })
  fileTable ['tool' 'files' 'directories'] $rows

  filePrompt 'use file sync'
}

def file [] {
  if $env.FILE_OP == sync {
    if not (filePlanShow) {
      return
    }
  }
  match $env.FILE_OP {
    diff => {
      for pair in $env.FILE_DIFF_PATH_PAIRS {
        let pairParts = $pair | split row '|'

        mut bin = ''
        for alias in ($pairParts.0 | split row ',') {
          if (which $alias | is-not-empty) {
            $bin = $alias
            break
          }
        }
        if ($bin | is-empty) {
          continue
        }

        let src = $pairParts.1 | str trim --left --char '/'
        let dstFilePath = replaceEnv $pairParts.2 | path expand

        let srcUrl = $"($env.REQ_URL_CFG)/file/($src)"

        let tmpFilePath = opPrintRunCmd mktemp --suffix '.file.diff.tmp' --tmpdir
        opPrintRunCmd http get --raw --redirect-mode follow $"r#'($srcUrl)'#" '|' save --force $"r#'($tmpFilePath)'#"

        let diffCmd = if (which diff | is-not-empty) { 'diff' } else { 'fc' }

        if ($dstFilePath | path exists) {
          opPrintRunCmd $diffCmd $"r#'($dstFilePath)'#" $"r#'($tmpFilePath)'#" '|' complete '|' get stdout '|' str trim --right
        } else {
          opPrintWarn $"`($dstFilePath)` does not exist"
        }

        opPrintRunCmd rm --force $"r#'($tmpFilePath)'#"
      }
    }
    find => {
      for entry in $env.FILE_FIND_KEYS {
        let parts = $entry | split row '|'
        let keys = $parts | get 0
        let ins = if ($parts | length) > 1 { $parts | get 1 } else { '' }

        mut bin = ''
        for alias in ($keys | split row ',') {
          if (which $alias | is-not-empty) {
            $bin = $alias
            break
          }
        }
        if ($bin | is-empty) {
          continue
        }

        opPrint $bin
        if ($ins | is-not-empty) {
          opPrint $"  ($ins)"
        }
      }
    }
    list => {
      for pair in $env.FILE_LIST_PATH_PAIRS {
        let pairParts = $pair | split row '|'

        mut bin = ''
        for alias in ($pairParts.0 | split row ',') {
          if (which $alias | is-not-empty) {
            $bin = $alias
            break
          }
        }
        if ($bin | is-empty) {
          continue
        }

        let src = $pairParts.1 | str trim --left --char '/'
        let dstFilePath = replaceEnv $pairParts.2 | path expand

        opPrint $"($src) -> ($dstFilePath)"
      }
    }
    sync => {
      for dir in ($env.FILE_SYNC_CLEAR_DIRS? | default []) {
        let dirParts = $dir | split row '|'

        mut bin = ''
        for alias in ($dirParts.0 | split row ',') {
          if (which $alias | is-not-empty) {
            $bin = $alias
            break
          }
        }
        if ($bin | is-empty) {
          continue
        }

        let dstFilePath = replaceEnv $dirParts.1 | path expand
        opPrintMaybeRunCmd rm --force --permanent --recursive $"r#'($dstFilePath)'#"
      }

      mut createdDirs = []
      for pair in $env.FILE_SYNC_PATH_PAIRS {
        let pairParts = $pair | split row '|'

        mut bin = ''
        for alias in ($pairParts.0 | split row ',') {
          if (which $alias | is-not-empty) {
            $bin = $alias
            break
          }
        }
        if ($bin | is-empty) {
          continue
        }

        let src = $pairParts.1 | str trim --left --char '/'
        let dstFilePath = replaceEnv $pairParts.2 | path expand

        let srcUrl = $"($env.REQ_URL_CFG)/file/($src)"

        let dstParentDirPath = $dstFilePath | path dirname
        if ($dstParentDirPath not-in $createdDirs) {
          $createdDirs = $createdDirs ++ [$dstParentDirPath]
          opPrintMaybeRunCmd mkdir $"r#'($dstParentDirPath)'#"
        }
        opPrintMaybeRunCmd http get --raw --redirect-mode follow $"r#'($srcUrl)'#" '|' save --force $"r#'($dstFilePath)'#"
      }

      for perm in ($env.FILE_SYNC_PATH_PERMS? | default []) {
        let permParts = $perm | split row '|'

        mut bin = ''
        for alias in ($permParts.0 | split row ',') {
          if (which $alias | is-not-empty) {
            $bin = $alias
            break
          }
        }
        if ($bin | is-empty) {
          continue
        }

        let cmd = replaceEnv $permParts.1
        opPrintMaybeRunCmd ...($cmd | split row ' ')
      }
    }
  }
}
