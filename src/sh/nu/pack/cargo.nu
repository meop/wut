def --env packCargo [] {
  let cmd = 'cargo'
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
      packOpAdd { |n| packGrepFind [$cmd search] $n } [$cmd binstall --locked]
    }
    find => {
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd install --list]
    }
    outdated => {
      packOpOutdated [$cmd install-update --list]
    }
    remove => {
      packOpRemove { |n| packGrepList [$cmd install --list] $n } [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd install-update --all] [$cmd install-update]
    }
    tidy => {
      packOp [$cmd cache --autoclean]
    }
  }
}
