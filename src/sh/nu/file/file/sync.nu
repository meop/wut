def fileOp [] {
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
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($srcUrl)'#" ')"' '|' save --force $"r#'($dstFilePath)'#"
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
