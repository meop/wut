& {
  if (-not $IsWindows) {
    opPrintWarn 'script is for winnt'
    return
  }
  $yn = ''
  if ($YES) {
    $yn = 'y'
  } else {
    $yn = Read-Host 'install rustup (user) [y,[n]]'
  }
  if ($yn -ne 'n') {
    $url = "https://win.rustup.rs/${env:SYS_CPU_ARCH}"
    Invoke-WebRequest -ErrorAction Stop -ProgressAction SilentlyContinue -OutFile "${env:HOME}\rustup-init.exe" -Uri $url
    & "${env:HOME}\rustup-init.exe"
    Remove-Item "${env:HOME}\rustup-init.exe"
  }
}
