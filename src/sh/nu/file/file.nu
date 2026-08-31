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


# a tool's compound key doubles as its candidate bin names, same as the per-pair check the sync loop already does
def fileBinHere [tool: string] {
  $tool | split row ',' | any { |alias| which $alias | is-not-empty }
}

# the plan for the two ops that go to the network: which tools are here, and how many files and destination dirs
# each one accounts for. diff fetches every source it compares, the same GET sync makes, so it is gated the same
def filePlanShow [pairsKey: string, dirsKey: string, toolsKey: string] {
  let pairs = ($env | get -o $pairsKey | default []) | where { |p| fileBinHere ($p | split row '|' | get 0) }
  let clearDirs = ($env | get -o $dirsKey | default []) | where { |d| fileBinHere ($d | split row '|' | get 0) }
  if ($pairs | is-empty) and ($clearDirs | is-empty) {
    return true
  }

  let fileTools = ($pairs | each { |p| $p | split row '|' | get 0 })
  let dirTools = ($clearDirs | each { |d| $d | split row '|' | get 0 })
  let tools = (($fileTools ++ $dirTools) | uniq | sort)
  fileTable ['tool' 'files' 'directories'] ($tools | enumerate | each { |t|
    [
      $"($t.index + 1)\) ($t.item)",
      ($fileTools | where { |x| $x == $t.item } | length | into string),
      ($dirTools | where { |x| $x == $t.item } | length | into string),
    ]
  })
  let picked = (wutSelectRead ($tools | length))
  if $picked == null {
    return false
  }
  load-env {($toolsKey): ($picked | each { |i| $tools | get ($i - 1) })}
  true
}

def fileToolChosen [toolsKey: string, tool: string] {
  let chosen = ($env | get -o $toolsKey | default [])
  ($chosen | is-empty) or ($tool in $chosen)
}

def file [] {
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
        if ($bin | is-empty) or (not (fileToolChosen 'FILE_DIFF_TOOLS' $pairParts.0)) {
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
      let here = (
        ($env.FILE_FIND_KEYS? | default []) | each { |entry| $entry | split row '|' }
          | where { |parts| fileBinHere ($parts | get 0) }
          | each { |parts| {
            bin: (($parts | get 0 | split row ',') | where { |a| which $a | is-not-empty } | first),
            ins: ($parts | get -o 1 | default ''),
          } }
      )
      if ($here | is-not-empty) {
        for e in $here {
          opPrint $e.bin
          if ($e.ins | is-not-empty) {
            opPrint $"  ($e.ins)"
          }
        }
        opPrint ''
        fileTable ['tool' 'files'] ($here | each { |e|
          [$e.bin, ($e.ins | split row ', ' | where { is-not-empty } | length | into string)]
        })
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
        if ($bin | is-empty) or (not (fileToolChosen 'FILE_SYNC_TOOLS' $dirParts.0)) {
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
        if ($bin | is-empty) or (not (fileToolChosen 'FILE_SYNC_TOOLS' $pairParts.0)) {
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
