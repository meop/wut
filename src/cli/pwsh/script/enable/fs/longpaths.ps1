&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? enable fs long paths (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      pwsh -nologo -noprofile -command {
        opPrintMaybeRunCmd Set-Location HKLM:

        $path = '\System\CurrentControlSet\Control\FileSystem'

        if (-not (Get-ItemProperty $path).LongPathsEnabled) {
          opPrintMaybeRunCmd New-ItemProperty $path -Name LongPathsEnabled -Value 1 -PropertyType DWord
        } else {
          opPrintMaybeRunCmd Set-ItemProperty $path -Name LongPathsEnabled -Value 1
        }

        opPrintMaybeRunCmd Write-Output $path LongPathsEnabled (Get-ItemProperty $path).LongPathsEnabled
      }
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
