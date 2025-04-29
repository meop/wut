&{
  if ($IsWindows) {
    if (Get-Command fzf -ErrorAction Ignore) {
      if ("${env:YES}") {
        $yn = 'y'
      } else {
        $yn = Read-Host '? setup fzf theme (user) [y, [n]]'
      }
      if ("${yn}" -ne 'n') {
        $fzf = "${HOME}/.fzf"

        $output = "${fzf}/colors.ps1"
        $outputTmp = "${fzf}/colors.zsh"
        $url = 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
        opPrintRunCmd Invoke-WebRequest -Uri "${url}" '|' New-Item "${outputTmp}" -Force '>' '$null'
        opPrintRunCmd Set-Content "${output}" '${env:FZF_DEFAULT_OPTS} = "${env:FZF_DEFAULT_OPTS} "+'

        foreach ($line in Get-Content "${outputTmp}") {
          $formattedLine = ($line -replace '\\', '').Trim()
          if ($line.Trim().StartsWith('--')) {
            opPrintRunCmd Add-Content "${output}" "  `'${formattedLine} `'+"
          }
        }

        opPrintRunCmd Add-Content "${output}" "  ''"
        opPrintRunCmd Remove-Item "${outputTmp}"
      }
    }
  }
}
