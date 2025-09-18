function opPrint {
  if [[ $SUCCINCT ]]; then
    return
  fi
  print -r -- "$*"
}

function opPrintErr {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print -r -- "$*" >&2
    return
  fi
  print -n "\033[0;31m" >&2
  print -n -r -- "$*" >&2
  print "\033[0m" >&2
}

function opPrintSucc {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print -r -- "$*"
    return
  fi
  print -n "\033[0;32m"
  print -n -r -- "$*"
  print "\033[0m"
}

function opPrintWarn {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print -r -- "$*"
    return
  fi
  print -n "\033[0;33m"
  print -n -r -- "$*"
  print "\033[0m"
}

function opPrintInfo {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print -r -- "$*"
    return
  fi
  print -n "\033[0;34m"
  print -n -r -- "$*"
  print "\033[0m"
}

function opPrintCmd {
  if [[ $SUCCINCT ]]; then
    return
  fi
  if [[ $GRAYSCALE ]]; then
    print -r -- "$*"
    return
  fi
  print -n "\033[0;35m"
  print -n -r "$1"
  print -n "\033[0m"
  shift 1
  if [[ $* ]]; then
    print -n " \033[0;36m"
    print -n -r -- "$*"
    print "\033[0m"
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
