&{
  if ($IsWindows) {
    if (Get-Command nvim -ErrorAction Ignore) {
      $yn = Read-Host '? setup nvim plugin manager (local) [y, [n]]'
      if ("${yn}" -ne 'n') {
        $share = "$(@(${env:XDG_DATA_HOME}, ${env:LOCALAPPDATA})[-not ${env:XDG_DATA_HOME}])"
        $nvim = "${share}/nvim-data"

        $output = "${nvim}/site/autoload/plug.vim"
        $url = 'https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
        runOpCond Invoke-WebRequest -Uri "${url}" '|' New-Item "${output}" -Force '>' '$null'
      }
    }
  }
}
