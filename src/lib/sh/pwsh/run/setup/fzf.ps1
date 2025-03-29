&{
  if ($IsWindows) {
    if (Get-Command fzf -ErrorAction Ignore) {
      $yn = Read-Host '? setup fzf theme (user) [[y]/n]'
      if ("${yn}" -eq 'y') {
        $fzf = "${HOME}/.fzf"

        $output = "${fzf}/colors.ps1"
        $outputTmp = "${fzf}/colors.zsh"
        $url = 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
        runOp Invoke-WebRequest -Uri "${url}" '|' New-Item "${outputTmp}" -Force '|' Out-Null
        runOp Set-Content "${output}" '${env:FZF_DEFAULT_OPTS} = "${env:FZF_DEFAULT_OPTS} "+'

        foreach ($line in Get-Content "${outputTmp}") {
          $formattedLine = ($line -replace '\\', '').Trim()
          if ($line.Trim().StartsWith('--')) {
            runOp Add-Content "${output}" "  `'${formattedLine} `'+"
          }
        }

        runOp Add-Content "${output}" "  ''"
        runOp Remove-Item "${outputTmp}"
      }
    }
  }
}
