def --env packPacman [] {
  # the yaml states the narrowest manager that can serve the group; packManagerBest widens it to the aur helper here
  let declared = ($env.PACK_MANAGER? | default 'pacman')
  let mgr = (packManagerBest $declared)
  if (
    ($declared not-in $PACK_PACMAN_FAMILY) or
    ($mgr == null) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'pacman')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($mgr) \(system\)") { return }

  let cmd = if $mgr == pacman { packElevate $mgr } else { $mgr }

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh $mgr }

  match $env.PACK_OP {
    add => {
      packOpAdd 'pacman' $"use ($mgr) \(system\)" { |n| packGrepFind [$cmd --sync --search] $n } [$cmd --sync --needed]
    }
    info => {
      packOpInfo [$cmd --sync --info]
    }
    list => {
      packOpList [$cmd --query]
    }
    outdated => {
      packOpOutdated [$cmd --query --upgrades]
    }
    remove => {
      packOpRemove 'pacman' $"use ($mgr) \(system\)" { |n| packGrepList [$cmd --query] $n } [$cmd --remove --nosave --recursive]
    }
    sync => {
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
