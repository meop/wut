&{
  if ($IsWindows) {
    $yn = Read-Host '? repair gpu msi properties (system) [[y]/n]'
    if ("${yn}" -eq 'y') {
      pwsh -nologo -noprofile -command {
        dynOp Set-Location HKLM:

        $root_path = '\SYSTEM\CurrentControlSet\Enum\PCI'
        $root_pci_base_id = '10DE' # nvidia

        foreach ($pci_dev_desc_key in (Get-ChildItem $root_path).Name) {
          if ($pci_dev_desc_key -Match $root_pci_base_id) {
            foreach ($key in (Get-ChildItem $pci_dev_desc_key).Name) {
              $path = Join-Path $key 'Device Parameters' 'Interrupt Management' 'MessageSignaledInterruptProperties'

              if (-not (Test-Path $path)) {
                dynOp New-Item $path -ItemType Directory
              }

              if (-not (Get-ItemProperty $path).MSISupported) {
                dynOp New-ItemProperty $path -Name MSISupported -Value 1 -PropertyType DWord
              } else {
                dynOp Set-ItemProperty $path -Name MSISupported -Value 1
              }

              dynOp Write-Output $path MSISupported (Get-ItemProperty $path).MSISupported
            }
          }
        }
      }
    }
  }
}
