function packWinget {
  $cmd = 'winget'
  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? use ${cmd} (system/user) [y, [n]]"
    }
    if ($yn -ne 'n') {
      $pssor = $PSStyle.OutputRendering
      # with ANSI rendering with to preserve color
      $PSStyle.OutputRendering = 'ansi'
      # use Out-String -stream to split line by line
      packWingetOp $cmd | Out-String -Stream | Where-Object {
        # skip lines starting with space, which are spinner / progress lines
        $_ -notmatch '^\s+'
      } |
        # use Out-Host to skip stdout buffer being copied to function output
        Out-Host
      $PSStyle.OutputRendering = $pssor
    }
  }
}
