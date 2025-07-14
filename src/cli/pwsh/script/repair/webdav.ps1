&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? repair webdav - set client file size limit to max (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      opPrintMaybeRunCmd Push-Location 'HKLM:'

      $path = '\System\CurrentControlSet\Services\WebClient\Parameters'

      if (-not ((Get-ItemProperty $path).PSObject.Properties['FileSizeLimitInBytes'])) {
        opPrintMaybeRunCmd New-ItemProperty "'${path}'" -Name FileSizeLimitInBytes -Value 4294967295 -PropertyType DWord
      } else {
        opPrintMaybeRunCmd Set-ItemProperty "'${path}'" -Name FileSizeLimitInBytes -Value 4294967295
      }

      opPrintMaybeRunCmd Write-Output "'${path}'" FileSizeLimitInBytes (Get-ItemProperty $path).FileSizeLimitInBytes

      opPrintMaybeRunCmd Pop-Location
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
