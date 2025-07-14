&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? repair gpu - set msi properties (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      opPrintMaybeRunCmd Push-Location 'HKLM:'

      $root_path = '\SYSTEM\CurrentControlSet\Enum\PCI'
      $root_pci_base_id = '10DE' # nvidia

      foreach ($pci_dev_desc_key in (Get-ChildItem $root_path).Name) {
        if ($pci_dev_desc_key -Match $root_pci_base_id) {
          foreach ($key in (Get-ChildItem $pci_dev_desc_key).Name) {
            $path = Join-Path $key 'Device Parameters' 'Interrupt Management' 'MessageSignaledInterruptProperties'

            if (-not (Test-Path $path)) {
              opPrintMaybeRunCmd New-Item "'${path}'" -ItemType Directory
            }

            if (-not ((Get-ItemProperty $path).PSObject.Properties['MSISupported'])) {
              opPrintMaybeRunCmd New-ItemProperty "'${path}'" -Name MSISupported -Value 1 -PropertyType DWord
            } else {
              opPrintMaybeRunCmd Set-ItemProperty "'${path}'" -Name MSISupported -Value 1
            }

            opPrintMaybeRunCmd Write-Output "'${path}'" MSISupported (Get-ItemProperty $path).MSISupported
          }
        }
      }

      opPrintMaybeRunCmd Pop-Location
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
