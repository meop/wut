&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? enable webdav client max sizes (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      pwsh -nologo -noprofile -command {
        opPrintMaybeRunCmd Set-Location HKLM:

        $path = '\System\CurrentControlSet\Services\WebClient\Parameters'

        if (-not (Get-ItemProperty $path).FileSizeLimitInBytes) {
          opPrintMaybeRunCmd New-ItemProperty $path -Name FileSizeLimitInBytes -Value 4294967295 -PropertyType DWord
        } else {
          opPrintMaybeRunCmd Set-ItemProperty $path -Name FileSizeLimitInBytes -Value 4294967295
        }

        opPrintMaybeRunCmd Write-Output $path FileSizeLimitInBytes (Get-ItemProperty $path).FileSizeLimitInBytes
      }
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
