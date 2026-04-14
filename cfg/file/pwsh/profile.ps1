$PSProfileDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
if (TestPath "${PSProfileDir}\env.ps1") {
  . "${PSProfileDir}\env.ps1"
}

iex (starship init powershell | Out-String)
iex (zoxide init powershell | Out-String)

Set-Alias bd 'cd -'
Set-Alias ud 'cd ..'

function v {
  iex "${env:VISUAL} $($args -join ' ')"
}
