# function packWingetPrintCmdOutput ($obj) {
#   $pssor = $PSStyle.OutputRendering
#   # Out-String will strip ANSI chars unless this is set
#   $PSStyle.OutputRendering = 'ansi'
#   # -stream will stream line by line
#   opPrintCmdOutput (($obj | Out-String -stream) | Where-Object {
#       # skip spinner and progress output
#       if (-not $_.StartsWith(' ')) { $_ }
#     })
#   $PSStyle.OutputRendering = $pssor
# }
function packWinget {
  $cmd = 'winget'
  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? use ${cmd} (system) [y, [n]]"
    }
    if ($yn -ne 'n') {
      packWingetOp $cmd | Out-Host
    }
  }
}
