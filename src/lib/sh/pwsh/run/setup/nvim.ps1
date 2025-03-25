if ($IsWindows) {
  if (Get-Command nvim -ErrorAction Ignore) {
    $yn = Read-Host '> setup nvim plugin manager [local]? (y/N)'
    if ("${yn}" -eq 'y') {
      $LOCAL_SHARE = "$(@(${env:XDG_DATA_HOME}, ${env:LOCALAPPDATA})[-not ${env:XDG_DATA_HOME}])"
      $NVIM_DATA = "${LOCAL_SHARE}/nvim-data"
      $output = "${NVIM_DATA}/site/autoload/plug.vim"
      $uri = 'https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
      Invoke-WebRequest -Uri "${uri}" | New-Item "${output}" -Force | Out-Null
    }
  }
}
