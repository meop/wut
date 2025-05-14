&{
  if ($IsWindows) {
    if (Get-Command fzf -ErrorAction Ignore) {
      $yn = ''
      if ($YES) {
        $yn = 'y'
      } else {
        $yn = Read-Host '? setup fzf theme (user) [y, [n]]'
      }
      if ($yn -ne 'n') {
        $fzf = "${HOME}/.fzf"

        $output = "${fzf}/colors.zsh"
        $outputPs = "${fzf}/colors.ps1"
        $url = 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
        opPrintMaybeRunCmd Invoke-WebRequest -Uri "${url}" '|' New-Item "${output}" -Force '>' '$null'
        opPrintMaybeRunCmd Set-Content "${outputPs}" '${env:FZF_DEFAULT_OPTS} = "${env:FZF_DEFAULT_OPTS} "+'

        foreach ($line in Get-Content "${output}") {
          $formattedLine = ($line -replace '\\', '').Trim()
          if ($line.Trim().StartsWith('--')) {
            opPrintMaybeRunCmd Add-Content "${outputPs}" "  `'${formattedLine} `'+"
          }
        }

        opPrintMaybeRunCmd Add-Content "${outputPs}" "  ''"
        opPrintMaybeRunCmd Remove-Item "${output}"
      }
    } else {
      Write-Host 'fzf is not installed'
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
