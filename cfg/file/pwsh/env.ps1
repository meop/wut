$env:SHELL = (Get-Command pwsh).Path

if ($env:USERNAME) {
  $env:USER = $env:USERNAME
}

if ($env:USERPROFILE) {
  $env:HOME = $env:USERPROFILE
} else {
  $env:HOME = $HOME
}

function Invoke-PathEnsure([string]$path) {
  $np = $path.Replace('/', [IO.Path]::DirectorySeparatorChar)
  if ((Test-Path $np) -and ($env:PATH -split [IO.Path]::PathSeparator -notcontains $np)) {
    $env:PATH = $np + [IO.Path]::PathSeparator + $env:PATH
  }
}

if (Test-Path "${env:HOME}/.pwsh") {
  Get-ChildItem "${env:HOME}/.pwsh" -Filter '*.ps1'
  | ForEach-Object {
    . $_.FullName
  }
}
