if ($IsWindows) {
  if (Get-Command fzf -ErrorAction Ignore) {
    $yn = Read-Host '? setup fzf theme [user] (y/N)'
    if ("${yn}" -eq 'y') {
      $FZF_HOME = "${env:HOME}/.fzf"
      $output = "${FZF_HOME}/colors.ps1"
      $outputTmp = "${FZF_HOME}/colors.zsh"
      $url = 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
      Invoke-WebRequest -Uri "${url}" | New-Item "${outputTmp}" -Force | Out-Null
      Set-Content -Path "${output}" -Value '${env:FZF_DEFAULT_OPTS} = "${env:FZF_DEFAULT_OPTS} "+'
      foreach ($line in Get-Content "${outputTmp}") {
        $formattedLine = ($line -replace '\\', '').Trim()
        if ($line.Trim().StartsWith('--')) {
          Add-Content -Path "${output}" -Value "  `'${formattedLine} `'+"
        }
      }
      Add-Content -Path "${output}" -Value "  ''"
      Remove-Item "${outputTmp}"
    }
  }
}
