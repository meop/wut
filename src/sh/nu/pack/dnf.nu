def --env packDnf [] {
  let cmd = 'dnf'
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
  let cmd = packSudoCmd $cmd

  match $env.PACK_OP {
    add => {
      packOp [$cmd makecache]
      packOpAdd { |n| packSearch [$cmd search] $n } [$cmd install]
    }
    find => {
      packOp [$cmd makecache]
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd list --installed]
    }
    outdated => {
      packOp [$cmd makecache]
      packOpOutdated [$cmd list --upgrades]
    }
    remove => {
      packOpRemove { |n| packInstalled [$cmd list --installed] $n } [$cmd remove]
    }
    sync => {
      packOp [$cmd makecache]
      packOpSync [$cmd distro-sync] [$cmd upgrade]
    }
    tidy => {
      opPrintMaybeRunCmd $cmd clean all
      opPrintMaybeRunCmd $cmd autoremove
    }
  }
}
