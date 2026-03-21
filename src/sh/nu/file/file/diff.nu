def fileOp [] {
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
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($srcUrl)'#" ')"' '|' save --force $"r#'($tmpFilePath)'#"

    let diffCmd = if (which diff | is-not-empty) { 'diff' } else { 'fc' }

    if ($dstFilePath | path exists) {
      opPrintMaybeRunCmd $diffCmd $"r#'($dstFilePath)'#" $"r#'($tmpFilePath)'#" '|' complete '|' get stdout '|' str trim --right
    } else {
      opPrintWarn $"`($dstFilePath)` does not exist"
    }

    opPrintRunCmd rm --force $"r#'($tmpFilePath)'#"
  }
}
