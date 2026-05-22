def --env packApk [] {
  let cmd = 'apk'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'remove' and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packSudoCmd $cmd

  match $env.PACK_OP {
    'add' => {
      packOp [$cmd update]
      packOpAdd { |n| packSearch [$cmd search] $n } [$cmd add]
    }
    'find' => {
      packOp [$cmd update]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list --installed]
    }
    'outdated' => {
      packOp [$cmd update]
      packOpOutdated [$cmd list -u]
    }
    'remove' => {
      packOpRemove { |n| packInstalled [$cmd list --installed] $n } [$cmd del]
    }
    'sync' => {
      packOp [$cmd update]
      packOpSync [$cmd upgrade] [$cmd add]
    }
    'tidy' => {
      packOp [$cmd cache clean]
    }
  }
}
