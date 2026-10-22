# npm is node's own package manager: it comes with the node it runs on, a distro's or the tarball's, the way go's
# install comes with go. a pnpm package is not that: the npm pnpm holds has its global prefix inside pnpm's own node
# runtime package, so an install there lands in pnpm's tree, its command off PATH, and goes the next time pnpm moves
# node. that npm is not a manager at all. pnpm 12 marks each command it puts down with a target file beside it
def packNpmIsPnpms [dir: string] {
  ($dir | is-not-empty) and ($dir | path join '.pnpm-shim-v1-npm-target' | path exists)
}

# npm and the node it runs on are one install, side by side: a distro's npm links into its lib dir, so the two are
# compared by the directory PATH found each in, not by what they link to. a global package's command starts
# `#!/usr/bin/env node`, so it runs on whichever node the shell finds first — which has to be this npm's, or its
# packages run on another install's however wut runs npm. the global prefix is the user's, as every manager above
# the native ones is, or each install would need sudo
def --env packNpmHeld [] {
  let npm = (which npm | get -o 0.path)
  let node = ($npm | path dirname | path join (if $nu.os-info.name == 'windows' { 'node.exe' } else { 'node' }))
  if not ($node | path exists) {
    return (packHeld '' 'no node beside npm' [$"npm ($npm)"])
  }
  let shellNode = (packShellWhich node)
  if $shellNode != $node {
    return (packHeld '' 'its packages run on another node' [$"npm ($npm)" $"PATH's node ($shellNode | default 'none')"])
  }
  let prefix = (packAsk [npm prefix --global] | get stdout | str trim)
  if not (packUnder $prefix ($env.HOME? | default $nu.home-dir)) {
    return (packHeld '' "npm's global prefix is outside your home" [$prefix 'npm config set prefix ~/.local'])
  }
  let bin = if $nu.os-info.name == 'windows' { $prefix } else { $prefix | path join bin }
  if not (($env.PACK_SHELL_PATH? | default $env.PATH) | any { |p| ($p | path expand) == ($bin | path expand) }) {
    return (packHeld '' "npm's bin dir is not on PATH" [$bin])
  }
  packHeld $"node (packVersionOf (packAsk [node --version] | get stdout))"
}

def --env packNpm [] {
  let cmd = 'npm'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install --global]
    }
    info => {
      packOpInfo [$cmd view]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd outdated --global]
    }
    remove => {
      packOpRemove [$cmd uninstall --global]
    }
    sync => {
      # node itself is whatever installed it's to move, a distro's or the tarball's: npm moves only its packages
      packOpSync [$cmd update --global] [$cmd update --global]
    }
    tidy => {
      # verify, not clean: it lets go of what nothing indexes, as pnpm's store prune does
      packOp [$cmd cache verify]
    }
  }
}
