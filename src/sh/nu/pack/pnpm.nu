def --env packPnpm [] {
  let cmd = 'pnpm'
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
      packOpAdd { |n| packSearch [$cmd search] $n } [$cmd add --global]
    }
    find => {
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd list --global]
    }
    outdated => {
      packOpOutdated [$cmd outdated --global]
    }
    remove => {
      packOpRemove { |n| packInstalled [$cmd list --global] $n } [$cmd remove --global]
    }
    sync => {
      packOp [$cmd runtime set node latest --global]
      packOp [$cmd self-update]
      let p = ^$cmd ls --global --parseable
        | lines
        | each { |line|
            let parts = ($line | path split)
            let idx = ($parts | enumerate | where item == 'node_modules' | get 0?.index?)
            if $idx == null { null } else {
              $parts | skip ($idx + 1) | str join '/'
            }
          }
        | compact
        | where { $in != node and $in != '@pnpm/exe' }
      packOpSync [$cmd update --global --latest ...$p] [$cmd update --global --latest]
    }
    tidy => {
      packOp [$cmd store prune]
    }
  }
}
