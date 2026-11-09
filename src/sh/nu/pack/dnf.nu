def --env packDnf [] {
  let mgr = 'dnf'
  if (packSkip $mgr) {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      packDnfEpel $cmd
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $mgr)
    }
    outdated => {
      packOpOutdated [$cmd list --upgrades]
    }
    remove => {
      packOpRemove [$cmd remove]
    }
    renew => {
      packOpRenew [$cmd reinstall]
    }
    sync => {
      packOpSync [$cmd distro-sync] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd clean all]
      packOp [$cmd autoremove]
    }
  }
}

# centos leaves out what epel carries, kde plasma among it, and epel builds against crb, which centos ships disabled.
# a group names a package the same on every rpm distro, and on the centos family epel is where it is, so an add there
# enables both first, the way brew taps what a name qualifies. dnf asks its own question before it installs
def --env packDnfEpel [cmd: string] {
  if not ($env.SYS_OS_LIKE? | default '' | str contains 'centos') {
    return
  }
  if not (packOk [rpm --query epel-release]) {
    packOpStrict [$cmd install epel-release]
  }
  let repos = (packComplete [dnf repolist --enabled] | get stdout | lines | each { |l| $l | split row ' ' | first })
  if 'crb' not-in $repos {
    # config-manager is a plugin on dnf 4, which a minimal install leaves out
    if not (packOk [rpm --query dnf-plugins-core]) {
      packOpStrict [$cmd install dnf-plugins-core]
    }
    packOpStrict [$cmd config-manager --set-enabled crb]
  }
}
