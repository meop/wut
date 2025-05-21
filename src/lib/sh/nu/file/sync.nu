def fileOp [] {
  if 'FILE_SYNC_CLEAR_DIRS' in $env {
    for dir in $env.FILE_SYNC_CLEAR_DIRS {
      opPrintMaybeRunCmd rm --force --permanent --recursive (envReplace $dir)
    }
  }

  for pair in $env.FILE_SYNC_PATH_PAIRS {
    let parts = $pair | split row '='
    let src = $parts.0 | str trim --left --char '/'
    let dst = envReplace $parts.1

    let url = $"($env.REQ_URL_CFG)/file/($src)"
    opPrintMaybeRunCmd mkdir ($dst | path dirname)
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $dst
  }

  if 'FILE_SYNC_PATH_PERMS' in $env {
    for perm in $env.FILE_SYNC_PATH_PERMS {
      opPrintMaybeRunCmd ...(envReplace $perm | split row ' ')
    }
  }
}
