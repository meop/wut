def fileOp [] {
  for pair in $env.FILE_DIFF_PATH_PAIRS {
    let pairParts = $pair | split row '|'
    if (which $pairParts.0 | is-empty) {
      continue
    }
    let src = $pairParts.1 | str trim --left --char '/'
    let dst = envReplace $pairParts.2

    let url = $"($env.REQ_URL_CFG)/file/($src)"
    let fileNewTemp = opPrintRunCmd mktemp --suffix '.file.diff.tmp' --tmpdir
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $fileNewTemp

    let diffCmd = if (which diff | is-not-empty) { 'diff' } else { 'fc' }

    if ($dst | path exists) {
      opPrintMaybeRunCmd $diffCmd $dst $fileNewTemp '|' complete '|' get stdout '|' str trim --right
    } else {
      opPrintWarn $"($dst) does not exist"
    }

    opPrintRunCmd rm --force $fileNewTemp
  }
}
