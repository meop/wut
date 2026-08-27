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
typeset -ga SCRIPT_FIND_ROWS

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
function scriptFindAdd {
  local action="$1"
  shift
  local -a tools
  local entry tool cmds
  for entry in "$@"; do
    tool="${entry%%=*}"
    cmds="${entry#*=}"
    if [[ $cmds == $entry ]]; then
      tools+=("$tool")
    elif scriptHasCmd ${(s:,:)cmds}; then
      tools+=("$tool")
    fi
  done
  (( ${#tools} )) || return
  SCRIPT_FIND_ROWS+=("${action}|${(j:, :)tools}")
}

# one table, one question, then the listing
function scriptFindShow {
  (( ${#SCRIPT_FIND_ROWS} )) || return 1
  local -a actions toolsets
  local row
  for row in "${SCRIPT_FIND_ROWS[@]}"; do
    actions+=("${row%%|*}")
    toolsets+=("${row#*|}")
  done
  local aw=6 i
  for i in {1..${#actions}}; do
    (( ${#actions[i]} > aw )) && aw=${#actions[i]}
  done
  opPrint "$(printf "%-${aw}s %s" action tools)"
  opPrint "$(printf "%-${aw}s %s" "------" "-----")"
  local -a t
  for i in {1..${#actions}}; do
    t=(${(s:, :)toolsets[i]})
    opPrint "$(printf "%-${aw}s %s" "${actions[i]}" "${#t}")"
  done
  local yn=''
  if [[ $YES ]]; then
    yn=y
  else
    opPrint ''
    read "yn?use script [y,[n]]: "
  fi
  [[ -z $yn || ${(L)yn} == y || ${(L)yn} == yes ]] || return 1
  for i in {1..${#actions}}; do
    opPrint "${actions[i]}"
    opPrint "  ${toolsets[i]}"
  done
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
    opPrint ''
    read "yn?use script [y,[n]]: "
  fi
  [[ -z $yn || ${(L)yn} == y || ${(L)yn} == yes ]]
}
