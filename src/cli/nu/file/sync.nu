def fileOp [] {
  if 'FILE_SYNC_CLEAR_DIRS' in $env {
    for dir in $env.FILE_SYNC_CLEAR_DIRS {
      let dirParts = $dir | split row '|'
      if (which $dirParts.0 | is-empty) {
        continue
      }
      opPrintMaybeRunCmd rm --force --permanent --recursive (envReplace ($dirParts.1 | path expand))
    }
  }

  mut createdDirs = []
  for pair in $env.FILE_SYNC_PATH_PAIRS {
    let pairParts = $pair | split row '|'
    if (which $pairParts.0 | is-empty) {
      continue
    }

    let src = $pairParts.1 | str trim --left --char '/'
    let dst = envReplace $pairParts.2 | path expand

    let url = $"($env.REQ_URL_CFG)/file/($src)"

    let dstParent = $dst | path dirname
    if ($dstParent not-in $createdDirs) {
      $createdDirs = $createdDirs ++ [$dstParent]
      opPrintMaybeRunCmd mkdir $dstParent
    }
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $dst
  }

  if 'FILE_SYNC_PATH_PERMS' in $env {
    for perm in $env.FILE_SYNC_PATH_PERMS {
      let permParts = $perm | split row '|'
      if (which $permParts.0 | is-empty) {
        continue
      }
      opPrintMaybeRunCmd ...((envReplace $permParts.1) | split row ' ')
    }
  }
}
