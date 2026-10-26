& {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    opPrintWarn 'docker is not installed'
    return
  }
  if (-not (opAsk 'setup - docker - enable service (system)')) {
    return
  }
  opPrintMaybeRunCmd sudo pwsh -c "'Set-Service com.docker.service -StartupType Automatic -Status Running'"
}
