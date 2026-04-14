$env:SHELL = (Get-Command pwsh).Path
$SHELL = "${env:SHELL}"

if ("${env:USERNAME}") {
  $env:USER = "${env:USERNAME}"
}
$USER = "${env:USER}"

if ("${env:USERPROFILE}") {
  $env:HOME = "${env:USERPROFILE}"
}

if (Test-Path "${HOME}\.pwsh") {
  Get-ChildItem "${HOME}\.pwsh" -Filter '*.ps1'
  | ForEach-Object {
    . $_.FullName
  }
}
