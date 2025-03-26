if ($IsWindows) {
  $yn = Read-Host '? repair rtc utc [system] (y/N)'
  if ("${yn}" -eq 'y') {
    pwsh -nologo -noprofile -command {
      Set-Location HKLM:

      $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

      if (-not (Get-ItemProperty $path).RealTimeIsUniversal) {
        runOp New-ItemProperty $path -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
      } else {
        runOp Set-ItemProperty $path -Name RealTimeIsUniversal -Value 1
      }

      Write-Output $path RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal
    }
  }
}
