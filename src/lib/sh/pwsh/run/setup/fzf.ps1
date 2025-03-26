if ($IsWindows) {
  if (Get-Command fzf -ErrorAction Ignore) {
    $yn = Read-Host '? setup fzf theme [user] (y/N)'
    if ("${yn}" -eq 'y') {
      $_fzf_home = "${env:HOME}/.fzf"

      $_output = "${_fzf_home}/colors.ps1"
      $_outputTmp = "${_fzf_home}/colors.zsh"
      $_url = 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
      runOp Invoke-WebRequest -Uri "${url}" '|' New-Item "${_outputTmp}" -Force '|' Out-Null
      runOp Set-Content -Path "${output}" -Value '${env:FZF_DEFAULT_OPTS} = "${env:FZF_DEFAULT_OPTS} "+'

      foreach ($line in Get-Content "${_outputTmp}") {
        $formattedLine = ($line -replace '\\', '').Trim()
        if ($line.Trim().StartsWith('--')) {
          runOp Add-Content -Path "${output}" -Value "  `'${formattedLine} `'+"
        }
      }

      runOp Add-Content -Path "${output}" -Value "  ''"
      runOp Remove-Item "${outputTmp}"
    }
  }
}
