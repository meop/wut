&{
  if ($IsWindows) {
    $yn = Read-Host '? repair gpu msi properties (system) [y/N]'
    if ("${yn}" -eq 'y') {
      pwsh -nologo -noprofile -command {
        runOp Set-Location HKLM:

        $root_path = '\SYSTEM\CurrentControlSet\Enum\PCI'
        $root_pci_base_id = '10DE' # nvidia

        foreach ($pci_dev_desc_key in (Get-ChildItem $root_path).Name) {
          if ($pci_dev_desc_key -Match $root_pci_base_id) {
            foreach ($key in (Get-ChildItem $pci_dev_desc_key).Name) {
              $path = Join-Path $key 'Device Parameters' 'Interrupt Management' 'MessageSignaledInterruptProperties'

              if (-not (Test-Path $path)) {
                runOp New-Item $path -ItemType Directory
              }

              if (-not (Get-ItemProperty $path).MSISupported) {
                runOp New-ItemProperty $path -Name MSISupported -Value 1 -PropertyType DWord
              } else {
                runOp Set-ItemProperty $path -Name MSISupported -Value 1
              }

              runOp Write-Output $path MSISupported (Get-ItemProperty $path).MSISupported
            }
          }
        }
      }
    }
  }
}
