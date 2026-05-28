def --env packApt [] {
  let cmd = 'apt'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packElevate $cmd

  match $env.PACK_OP {
    add => {
      packOp [$cmd update]
      packOpAdd { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
      packOp [$cmd update]
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd list --installed]
    }
    outdated => {
      packOp [$cmd update]
      packOpOutdated [$cmd list --upgradable]
    }
    remove => {
      packOpRemove { |n| packGrepList [$cmd list --installed] $n } [$cmd purge --autoremove]
    }
    sync => {
      packOp [$cmd update]
      packOpSync [$cmd full-upgrade] [$cmd install]
    }
    tidy => {
      packOp [$cmd clean]
      packOp [$cmd autoremove --purge]
    }
  }
}
