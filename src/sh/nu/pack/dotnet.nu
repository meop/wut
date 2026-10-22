# dotnet's global tools are apphost binaries in ~/.dotnet/tools, recorded in its .store and shared by every dotnet. a
# tool does not find its runtime through PATH but through DOTNET_ROOT, and with that unset falls back to the system's
# dotnet location. so a dotnet is one install with its tools when DOTNET_ROOT names its own root, or, unset, when it
# is the system's own
def packDotnetRoot [] {
  which dotnet | get -o 0.path | default '' | path expand | path dirname
}

def packDotnetToolsDir [] {
  [($env.HOME? | default $nu.home-dir) .dotnet tools] | path join
}

# dotnetup keeps the SDKs it installs, side by side, under its own root; a dotnet there is its, and moves with it
def packDotnetupOwns [root: string] {
  (which dotnetup | is-not-empty) and ($root | path split | any { |p| $p == 'dotnetup' })
}

def --env packDotnetHeld [] {
  let root = (packDotnetRoot)
  let set = ($env.DOTNET_ROOT? | default null)
  if $set != null and ($set | path expand) != $root {
    return (packHeld '' "DOTNET_ROOT is another install's" [$"dotnet ($root)" $"DOTNET_ROOT ($set)"])
  }
  if $set == null and (packUnder $root ($env.HOME? | default $nu.home-dir)) {
    # the value, not `dotnetup env set shell`: that writes a shell profile, and the env is the dotfiles' to set
    return (packHeld '' "DOTNET_ROOT is not set, so its tools run on the system's dotnet" [$"DOTNET_ROOT=($root)"])
  }
  # only once there are tools: a dotnet used for builds alone has nothing there to reach
  let tools = (packDotnetToolsDir)
  let held = ($tools | path join .store | path exists)
  if $held and not (($env.PACK_SHELL_PATH? | default $env.PATH) | any { |p| ($p | path expand) == ($tools | path expand) }) {
    return (packHeld '' "dotnet's tools dir is not on PATH" [$tools])
  }
  # asked from the home dir: a global.json above the cwd picks the sdk otherwise
  let res = (packAsk [dotnet --version] --home)
  if $res.exit_code != 0 {
    return (packHeld '' 'dotnet has no sdk' [$"dotnet ($root)"])
  }
  let by = if (packDotnetupOwns $root) { ' (dotnetup)' } else { '' }
  packHeld $"sdk (packVersionOf $res.stdout)($by)"
}

# what it holds, by package id: the json form, since the table pads and truncates
def --env packDotnetInstalled [] {
  packListedNames [dotnet tool list --global --format json] { |line| $line }
    | str join ''
    | try { from json | get -o data | default [] | get packageId } catch { |e| opRethrowInterrupt $e; [] }
}

def --env packDotnet [] {
  let cmd = 'dotnet'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd tool install --global] --each
    }
    info => {
      packOpInfo [$cmd tool search]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    remove => {
      packOpRemove [$cmd tool uninstall --global] --each
    }
    sync => {
      # dotnetup moves each sdk channel it tracks to its latest before the tools update against it. a distro's dotnet
      # is that distro's to move
      if ((packNameList 'PACK_SYNC_NAMES') | is-empty) and (packDotnetupOwns (packDotnetRoot)) {
        packOp [dotnetup update]
      }
      packOpSync [$cmd tool update --global --all] [$cmd tool update --global] --each
    }
    tidy => {
      packOp [$cmd nuget locals http-cache --clear]
    }
  }
}
