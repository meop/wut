$env:SHELL = (Get-Command pwsh).Path

if ("${env:USERNAME}") {
  $env:USER = "${env:USERNAME}"
}

if ("${env:USERPROFILE}") {
  $env:HOME = "${env:USERPROFILE}"
} else {
  $env:HOME = $HOME
}

if (Test-Path "${env:HOME}\.pwsh") {
  Get-ChildItem "${env:HOME}\.pwsh" -Filter '*.ps1'
  | ForEach-Object {
    . $_.FullName
  }
}
