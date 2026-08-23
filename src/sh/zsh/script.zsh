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

typeset -ga SCRIPT_PLAN_ROWS

function scriptPlanAdd {
  local action="$1" tool="$2" shell="$3"
  shift 3
  if (( $# )) && ! scriptHasCmd "$@"; then
    return
  fi
  SCRIPT_PLAN_ROWS+=("${action}|${tool}|${shell}")
}

# one table, one question: a script that runs after this does not ask whether to run
function scriptPlanShow {
  if (( ${#SCRIPT_PLAN_ROWS} == 0 )); then
    return 1
  fi
  local -a actions tools shells
  local row
  for row in "${SCRIPT_PLAN_ROWS[@]}"; do
    actions+=("${row%%|*}")
    tools+=("${${row#*|}%%|*}")
    shells+=("${row##*|}")
  done
  local aw=6 tw=4 i
  for i in {1..${#actions}}; do
    (( ${#actions[i]} > aw )) && aw=${#actions[i]}
    (( ${#tools[i]} > tw )) && tw=${#tools[i]}
  done
  opPrint "$(printf "%-${aw}s %-${tw}s %s" action tool shell)"
  opPrint "$(printf "%-${aw}s %-${tw}s %s" "------" "----" "-----")"
  for i in {1..${#actions}}; do
    opPrint "$(printf "%-${aw}s %-${tw}s %s" "${actions[i]}" "${tools[i]}" "${shells[i]}")"
  done
  local yn=''
  if [[ $YES ]]; then
    yn=y
  else
    read "yn?use script [y,[n]]: "
  fi
  [[ -z $yn || ${(L)yn} == y || ${(L)yn} == yes ]]
}
