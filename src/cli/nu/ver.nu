do {
  let sh_ver_major = 0
  let sh_ver_minor = 106

  if ((version | get major) < $sh_ver_major) or ((version | get minor) < $sh_ver_minor) {
    opPrintErr $"nu must be >= '($sh_ver_major).($sh_ver_minor)' .. found '(version | get version)' .. aborting"
    exit 1
  }
}
