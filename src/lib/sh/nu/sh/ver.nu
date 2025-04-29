do {
  let sh_version_major = 0
  let sh_version_minor = 103

  if ((version | get major) < $sh_version_major) or ((version | get minor) < $sh_version_minor) {
    opPrintErr $"nu must be >= '($sh_version_major).($sh_version_minor)' .. found '(version | get version)' .. aborting"
    exit 1
  }
}
