def --env packWinget [] {
  let cmd = 'winget'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user/system\)") { return }

  match $env.PACK_OP {
    add => {
      packOp [$cmd source update]
      packOpAdd { |n| packGrepFind [$cmd search --id] $n } [$cmd install] --each
    }
    find => {
      packOp [$cmd source update]
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOp [$cmd source update]
      packOpOutdated [$cmd upgrade]
    }
    remove => {
      packOpRemove { |n| packGrepList [$cmd list] $n } [$cmd uninstall] --each
    }
    sync => {
      packOp [$cmd source update]
      packOpSync [$cmd upgrade --all] [$cmd upgrade] --each
    }
  }
}
