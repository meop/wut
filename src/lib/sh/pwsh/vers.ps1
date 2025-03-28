&{
  $sh_version_major = 7
  $sh_version_minor = 5

  if ($PSVersionTable.PSVersion.Major -lt ${sh_version_major} -or
      $PSVersionTable.PSVersion.Minor -lt ${sh_version_minor}) {
    printErr "pwsh must be >= '${sh_version_major}.${sh_version_minor}' .. found '$($PSVersionTable.PSVersion)' .. aborting"
    exit 1
  }
}
