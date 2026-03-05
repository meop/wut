def fileOp [] {
  if 'FILE_SYNC_CLEAR_DIRS' in $env {
    for dir in $env.FILE_SYNC_CLEAR_DIRS {
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

      let dst = replaceEnv $dirParts.1 | path expand
      opPrintMaybeRunCmd rm --force --permanent --recursive $"r#'($dst)'#"
    }
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
    let dst = replaceEnv $pairParts.2 | path expand

    let url = $"($env.REQ_URL_CFG)/file/($src)"

    let dstParent = $dst | path dirname
    if ($dstParent not-in $createdDirs) {
      $createdDirs = $createdDirs ++ [$dstParent]
      opPrintMaybeRunCmd mkdir $"r#'($dstParent)'#"
    }
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"' '|' save --force $"r#'($dst)'#"
  }

  if 'FILE_SYNC_PATH_PERMS' in $env {
    for perm in $env.FILE_SYNC_PATH_PERMS {
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
