&{
  if ($IsWindows) {
    $yn = Read-Host '? repair rtc utc (system) [y, [n]]'
    if ("${yn}" -ne 'n') {
      pwsh -nologo -noprofile -command {
        runOpCond Set-Location HKLM:

        $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

        if (-not (Get-ItemProperty $path).RealTimeIsUniversal) {
          runOpCond New-ItemProperty $path -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
        } else {
          runOpCond Set-ItemProperty $path -Name RealTimeIsUniversal -Value 1
        }

        runOpCond Write-Output $path RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal
      }
    }
  }
}
