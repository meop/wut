def --env packDeno [] {
  let cmd = 'deno'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install --force --global --no-config --no-lock] --each
    }
    info => {
      for term in (packInfoNames) {
        packDo [$cmd info --no-config --no-lock $"npm:($term)"]
        packDo [$cmd info --no-config --no-lock $"jsr:($term)"]
      }
    }
    list => {
      # not packOpList: every other manager's listing is an external command, and packOp runs those in a fresh
      # `nu -c` where a wut function does not exist — `try { packDenoInstalled }` swallowed its own not-found
      # error and printed nothing at all. deno's listing is nu code, so it is read and printed here
      let names = (packDenoInstalled)
      let terms = (packNameList 'PACK_LIST_NAMES')
      for n in $names {
        if ($terms | is-empty) or ($terms | any { |t| $n | str contains --ignore-case $t }) {
          opPrint $n
        }
      }
    }
    remove => {
      packOpRemove [$cmd uninstall --global] --each
    }
    sync => {
      # deno's install is its update, so a name it does not already have would be installed rather than updated:
      # the names are whatever it holds, narrowed by what was asked for
      let names = if ((packNameList 'PACK_SYNC_NAMES') | is-empty) {
        packDenoInstalled
      } else {
        packSyncNames
      }
      for n in $names {
        packOp [$cmd install --force --global --no-config --no-lock $"($n)@latest"]
      }
    }
    tidy => {
      packOp [$cmd clean]
    }
  }
}
