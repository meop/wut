## env
$PSProfileDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
if (TestPath "${PSProfileDir}\env.ps1") {
  . "${PSProfileDir}\env.ps1"
}

## prompt
Invoke-Expression (starship init powershell | Out-String)

## jump
Invoke-Expression (zoxide init powershell | Out-String)

## aliases
Set-Alias bd 'cd -'
Set-Alias ud 'cd ..'

## functions
function v {
  Invoke-Expression "${env:VISUAL} $($args -join ' ')"
}
