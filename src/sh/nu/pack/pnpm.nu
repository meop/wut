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
      packOpAdd { |n| packGrepFind [$cmd search] $n } [$cmd add --global]
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
      packOpRemove { |n| packGrepList [$cmd list --global] $n } [$cmd remove --global]
    }
    sync => {
      let names = if ($env.PACK_SYNC_NAMES? | is-not-empty) {
        $env.PACK_SYNC_NAMES
      } else {
        ^$cmd ls --global --parseable
          | lines
          | each { |line|
              let parts = ($line | path split)
              let idx = ($parts | enumerate | where item == 'node_modules' | get 0?.index?)
              if $idx == null { null } else {
                $parts | skip ($idx + 1) | str join '/'
              }
            }
          | compact
          | where { $in != bun and $in != deno and $in != node }
      }
      if ($names | is-not-empty) {
        packOp ([$cmd update --global --latest] ++ $names)
      }
    }
    tidy => {
      packOp [$cmd store prune]
    }
  }
}
