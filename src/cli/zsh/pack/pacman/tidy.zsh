function packPacmanOp {
  # https://gitlab.archlinux.org/pacman/pacman/-/issues/297
  opPrintMaybeRunCmd sudo find /var/cache/pacman/pkg/ -mindepth 1 -type d -empty -delete
  opPrintMaybeRunCmd $1 --sync --clean
}
