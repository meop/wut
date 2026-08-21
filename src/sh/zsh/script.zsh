function scriptHasCmd {
  local cmd
  for cmd in "$@"; do
    if type "$cmd" > /dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
function scriptFindGroup {
  local label="$1"
  shift
  local tools=()
  local entry name cmds
  for entry in "$@"; do
    name="${entry%%=*}"
    cmds="${entry#*=}"
    if [[ $cmds == "$entry" || -z $cmds ]]; then
      tools+=("$name")
      continue
    fi
    if scriptHasCmd ${(s:,:)cmds}; then
      tools+=("$name")
    fi
  done
  if (( ${#tools} == 0 )); then
    return
  fi
  opPrint "$label"
  opPrint "  ${(j:, :)tools}"
}
