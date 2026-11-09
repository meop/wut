def --env packScoop [] {
  let bin = 'scoop'
  let cmd = (packScoopCmd)
  if (packSkip $bin) {
    return
  }


  packRefreshForOp $bin

  match $env.PACK_OP {
    add => {
      packScoopBuckets $cmd
      packOpAdd ($cmd ++ [install])
    }
    info => {
      packOpInfo ($cmd ++ [info])
    }
    list => {
      packOpList (packListCmd 'scoop')
    }
    outdated => {
      packOpOutdated ($cmd ++ [status])
    }
    remove => {
      packOpRemove ($cmd ++ [uninstall --purge])
    }
    sync => {
      packOpSync ($cmd ++ [update --all]) ($cmd ++ [update])
    }
    tidy => {
      packOp ($cmd ++ [cache rm --all])
      packOp ($cmd ++ [cleanup --all])
    }
  }
}

# a name its bucket qualifies, games/xemu, needs that bucket added first: scoop installs from a bucket it has, and
# adds a known one by its name alone. a bucket is a directory under scoop's buckets dir, so asking is a look there
def --env packScoopBuckets [cmd: list<string>] {
  let root = ($env.SCOOP? | default ([($env.HOME? | default $nu.home-dir) scoop] | path join))
  let wanted = ($env.PACK_ADD_NAMES? | default [] | each { |raw| (packNameParts $raw).name }
    | where { |n| $n | str contains '/' } | each { |n| $n | split row '/' | first } | uniq)
  for bucket in $wanted {
    if not ([$root buckets $bucket] | path join | path exists) {
      packOpStrict ($cmd ++ [bucket add $bucket])
    }
  }
}
