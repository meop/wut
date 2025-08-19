& {
  $sh_ver_major = 7
  $sh_ver_minor = 5

  if ($PSVersionTable.PSVersion.Major -lt $sh_ver_major -or
      $PSVersionTable.PSVersion.Minor -lt $sh_ver_minor) {
    opPrintErr "pwsh must be >= '${sh_ver_major}.${sh_ver_minor}' .. found '$($PSVersionTable.PSVersion)' .. aborting"
    exit 1
  }
}
