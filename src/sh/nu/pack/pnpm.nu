def --env packPnpm [] {
  let cmd = 'pnpm'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'pnpm')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd 'pnpm' $"use pnpm \(user\)" { |n| packGrepFind [$cmd search] $n } [$cmd add --global]
    }
    find => {
      packOpFind [$cmd search]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd list --global]
    }
    outdated => {
      packOpOutdated [$cmd outdated --global]
    }
    remove => {
      packOpRemove 'pnpm' $"use pnpm \(user\)" { |n| packGrepList [$cmd list --global] $n } [$cmd remove --global]
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
