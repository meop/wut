&{
  if ($IsWindows) {
    if (Get-Command fzf -ErrorAction Ignore) {
      $yn = Read-Host '? setup fzf theme (user) [[y]/n]'
      if ("${yn}" -eq 'y') {
        $fzf = "${HOME}/.fzf"

        $output = "${fzf}/colors.ps1"
        $outputTmp = "${fzf}/colors.zsh"
        $url = 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
        dynOp Invoke-WebRequest -Uri "${url}" '|' New-Item "${outputTmp}" -Force '|' Out-Null
        dynOp Set-Content "${output}" '${env:FZF_DEFAULT_OPTS} = "${env:FZF_DEFAULT_OPTS} "+'

        foreach ($line in Get-Content "${outputTmp}") {
          $formattedLine = ($line -replace '\\', '').Trim()
          if ($line.Trim().StartsWith('--')) {
            dynOp Add-Content "${output}" "  `'${formattedLine} `'+"
          }
        }

        dynOp Add-Content "${output}" "  ''"
        dynOp Remove-Item "${outputTmp}"
      }
    }
  }
}
