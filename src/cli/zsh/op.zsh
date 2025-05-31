function opPrint {
  if [[ $SUCCINCT ]]; then
    return
  fi
  print "$*"
}

function opPrintErr {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print "$*" >&2
    return
  fi
  print "\033[0;31m$*\033[0m" >&2
}

function opPrintSucc {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print "$*"
    return
  fi
  print "\033[0;32m$*\033[0m"
}

function opPrintWarn {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print "$*"
    return
  fi
  print "\033[0;33m$*\033[0m"
}

function opPrintInfo {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print "$*"
    return
  fi
  print "\033[0;34m$*\033[0m"
}

function opPrintCmd {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print "$*"
    return
  fi
  print -n "\033[0;35m$1\033[0m"
  shift 1
  if [[ $* ]]; then
    print " \033[0;36m$*\033[0m"
  fi
}

function opRunCmd {
  eval "$*"
}

function opPrintRunCmd {
  opPrintCmd "$@"
  opRunCmd "$@"
}

function opPrintMaybeRunCmd {
  opPrintCmd "$@"
  if [[ -z $NOOP ]]; then
    opRunCmd "$@"
  fi
}
