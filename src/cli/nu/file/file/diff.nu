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
    let dst = replaceEnv $pairParts.2 | path expand

    let url = $"($env.REQ_URL_CFG)/file/($src)"

    let fileNewTemp = opPrintRunCmd mktemp --suffix '.file.diff.tmp' --tmpdir
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"' '|' save --force $"r#'($fileNewTemp)'#"

    let diffCmd = if (which diff | is-not-empty) { 'diff' } else { 'fc' }

    if ($dst | path exists) {
      opPrintMaybeRunCmd $diffCmd $"r#'($dst)'#" $"r#'($fileNewTemp)'#" '|' complete '|' get stdout '|' str trim --right
    } else {
      opPrintWarn $"`($dst)` does not exist"
    }

    opPrintRunCmd rm --force $"r#'($fileNewTemp)'#"
  }
}
