&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? enable clock utc (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      pwsh -nologo -noprofile -command {
        opPrintMaybeRunCmd Set-Location HKLM:

        $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

        if (-not (Get-ItemProperty $path).RealTimeIsUniversal) {
          opPrintMaybeRunCmd New-ItemProperty $path -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
        } else {
          opPrintMaybeRunCmd Set-ItemProperty $path -Name RealTimeIsUniversal -Value 1
        }

        opPrintMaybeRunCmd Write-Output $path RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal
      }
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
