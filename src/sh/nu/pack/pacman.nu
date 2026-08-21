def --env packPacman [] {
  let mgr = if PACK_MANAGER in $env {
    $env.PACK_MANAGER
  } else if (which yay | is-not-empty) {
    'yay'
  } else if (which paru | is-not-empty) {
    'paru'
  } else {
    'pacman'
  }
  if (
    ($mgr not-in ['yay', 'paru', 'pacman']) or
    (which $mgr | is-empty) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'pacman')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and not (packPrompt $"use ($mgr) \(system\)") { return }
  let cmd = if $mgr == pacman { packElevate $mgr } else { $mgr }

  match $env.PACK_OP {
    add => {
      packOp [$cmd --sync --refresh]
      packOpAdd 'pacman' $"use ($mgr) \(system\)" { |n| packGrepFind [$cmd --sync --search] $n } [$cmd --sync --needed]
    }
    find => {
      packOp [$cmd --sync --refresh]
      packOpFind [$cmd --sync --search]
    }
    info => {
      packOp [$cmd --sync --refresh]
      packOpInfo [$cmd --sync --info]
    }
    list => {
      packOpList [$cmd --query]
    }
    outdated => {
      packOp [$cmd --sync --refresh]
      packOpOutdated [$cmd --query --upgrades]
    }
    remove => {
      packOpRemove 'pacman' $"use ($mgr) \(system\)" { |n| packGrepList [$cmd --query] $n } [$cmd --remove --nosave --recursive]
    }
    sync => {
      packOp [$cmd --sync --refresh]
      packOpSync [$cmd --sync --sysupgrade] [$cmd --sync --needed]
    }
    tidy => {
      # https://gitlab.archlinux.org/pacman/pacman/-/issues/297
      packOp [sudo find /var/cache/pacman/pkg/ -mindepth 1 -type d -empty -delete]
      packOp [$cmd --sync --clean --clean]
      let orphans = (do { run-external $mgr '--query' '--deps' '--unrequired' '--quiet' }
        | complete
        | get stdout
        | lines
        | where { |n| ($n | is-not-empty) })
      if ($orphans | is-not-empty) {
        packOp ([$cmd --remove --nosave --recursive] ++ $orphans)
      }
    }
  }
}
