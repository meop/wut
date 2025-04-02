&{
  if ($IsWindows) {
    $yn = Read-Host '? repair rtc utc (system) [n/[y]]'
    if ("${yn}" -eq 'y') {
      pwsh -nologo -noprofile -command {
        dynOp Set-Location HKLM:

        $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

        if (-not (Get-ItemProperty $path).RealTimeIsUniversal) {
          dynOp New-ItemProperty $path -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
        } else {
          dynOp Set-ItemProperty $path -Name RealTimeIsUniversal -Value 1
        }

        dynOp Write-Output $path RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal
      }
    }
  }
}
