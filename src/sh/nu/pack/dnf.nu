def --env packDnf [] {
  let cmd = 'dnf'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'dnf')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packElevate $cmd

  match $env.PACK_OP {
    add => {
      packOp [$cmd makecache]
      packOpAdd 'dnf' $"use dnf \(system\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
      packOp [$cmd makecache]
      packOpFind [$cmd search]
    }
    info => {
      packOp [$cmd makecache]
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd list --installed]
    }
    outdated => {
      packOp [$cmd makecache]
      packOpOutdated [$cmd list --upgrades]
    }
    remove => {
      packOpRemove 'dnf' $"use dnf \(system\)" { |n| packGrepList [$cmd list --installed] $n } [$cmd remove]
    }
    sync => {
      packOp [$cmd makecache]
      packOpSync [$cmd distro-sync] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd clean all]
      packOp [$cmd autoremove]
    }
  }
}
