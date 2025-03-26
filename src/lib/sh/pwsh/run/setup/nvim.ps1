if ($IsWindows) {
  if (Get-Command nvim -ErrorAction Ignore) {
    $yn = Read-Host '? setup nvim plugin manager [local] (y/N)'
    if ("${yn}" -eq 'y') {
      $_local_share = "$(@(${env:XDG_DATA_HOME}, ${env:LOCALAPPDATA})[-not ${env:XDG_DATA_HOME}])"
      $_nvim = "${_local_share}/nvim-data"

      $_output = "${_nvim}/site/autoload/plug.vim"
      $_url = 'https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
      runOp Invoke-WebRequest -Uri "${_url}" '|' New-Item "${_output}" -Force '|' Out-Null
    }
  }
}
