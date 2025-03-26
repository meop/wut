$SH_VERSION_MAJOR = 7
$SH_VERSION_MINOR = 5

if ($PSVersionTable.PSVersion.Major -lt ${SH_VERSION_MAJOR} -or
    $PSVersionTable.PSVersion.Minor -lt ${SH_VERSION_MINOR}) {
  Write-Error "pwsh must be >= '${SH_VERSION_MAJOR}.${SH_VERSION_MINOR}' .. found '$($PSVersionTable.PSVersion)' .. aborting"
  exit 1
}
