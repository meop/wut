&{
  if ($IsWindows) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? repair gpu msi properties (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      pwsh -nologo -noprofile -command {
        shRunOpCond Set-Location HKLM:

        $root_path = '\SYSTEM\CurrentControlSet\Enum\PCI'
        $root_pci_base_id = '10DE' # nvidia

        foreach ($pci_dev_desc_key in (Get-ChildItem $root_path).Name) {
          if ($pci_dev_desc_key -Match $root_pci_base_id) {
            foreach ($key in (Get-ChildItem $pci_dev_desc_key).Name) {
              $path = Join-Path $key 'Device Parameters' 'Interrupt Management' 'MessageSignaledInterruptProperties'

              if (-not (Test-Path $path)) {
                shRunOpCond New-Item $path -ItemType Directory
              }

              if (-not (Get-ItemProperty $path).MSISupported) {
                shRunOpCond New-ItemProperty $path -Name MSISupported -Value 1 -PropertyType DWord
              } else {
                shRunOpCond Set-ItemProperty $path -Name MSISupported -Value 1
              }

              shRunOpCond Write-Output $path MSISupported (Get-ItemProperty $path).MSISupported
            }
          }
        }
      }
    }
  }
}
