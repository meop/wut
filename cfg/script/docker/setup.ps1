& {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    opPrintWarn 'docker is not installed'
    return
  }
  opPrintInfo 'setup docker via pwsh'
}
