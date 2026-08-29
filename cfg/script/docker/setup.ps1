& {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    opPrintWarn 'docker is not installed'
    return
  }
  $yn = ''
  if ($YES) {
    $yn = 'y'
  } else {
    $yn = Read-Host 'setup - docker - enable service (system) [y,[n]]'
  }
  if (($yn -ne '') -and ($yn.ToLower() -ne 'y') -and ($yn.ToLower() -ne 'yes')) {
    return
  }
  opPrintMaybeRunCmd sudo pwsh -c "'Set-Service com.docker.service -StartupType Automatic -Status Running'"
}
