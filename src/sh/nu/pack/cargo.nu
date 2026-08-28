def --env packCargo [] {
  let cmd = 'cargo'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'cargo')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd 'cargo' $"use cargo \(user\)" { |n| packGrepFind [$cmd search] $n } [$cmd binstall --locked]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd install --list]
    }
    outdated => {
      packOpOutdated [$cmd install-update --list]
    }
    remove => {
      packOpRemove 'cargo' $"use cargo \(user\)" { |n| packGrepList [$cmd install --list] $n } [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd install-update --all] [$cmd install-update]
    }
    tidy => {
      packOp [$cmd cache --autoclean]
    }
  }
}
