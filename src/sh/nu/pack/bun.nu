def --env packBun [] {
  let cmd = 'bun'
  # bun's global "project" (package.json) is lazily created on first successful add; until then, or if an add
  # ever fails partway (writes package.json but not the lockfile), list/update/remove/cache commands against it
  # error out even though nothing being installed is a perfectly normal state, not a real problem
  let isBunNoGlobalInstallErr = { |stderr| ($stderr | str contains 'No package.json') or ($stderr | str contains 'Lockfile not found') }
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd { |n| [(packHttpGetNpm $n), (packHttpGetJsr $n)] | flatten | is-not-empty } [$cmd add --force --global]
    }
    find => {
      for term in $env.PACK_FIND_NAMES {
        [(packHttpGetNpm $term), (packHttpGetJsr $term)] | flatten | print
      }
    }
    list => {
      opPrintCmd $cmd list --global
      let result = (do { ^$cmd list --global } | complete)
      if $result.exit_code == 0 {
        let names = ($env.PACK_LIST_NAMES? | default [])
        if ($names | is-empty) {
          print $result.stdout
        } else {
          for term in $names {
            $result.stdout | lines | where { |l| $l | str contains --ignore-case $term } | each { |l| print $l }
          }
        }
      } else if not (do $isBunNoGlobalInstallErr $result.stderr) {
        opPrintErr $result.stderr
      }
    }
    remove => {
      packOpRemove { |n| packGrepList [$cmd list --global] $n } [$cmd remove --global]
    }
    sync => {
      if ($env.PACK_SYNC_NAMES? | is-not-empty) {
        packOpSync [$cmd update --force --global --latest] [$cmd update --force --global --latest]
      } else {
        opPrintCmd $cmd update --force --global --latest
        if NOOP not-in $env {
          let result = (do { ^$cmd update --force --global --latest } | complete)
          if $result.exit_code != 0 and not (do $isBunNoGlobalInstallErr $result.stderr) {
            opPrintErr $result.stderr
          }
        }
      }
    }
    tidy => {
      opPrintCmd $cmd pm cache rm
      if NOOP not-in $env {
        let result = (do { ^$cmd pm cache rm } | complete)
        if $result.exit_code != 0 and not (do $isBunNoGlobalInstallErr $result.stderr) {
          opPrintErr $result.stderr
        }
      }
    }
  }
}
