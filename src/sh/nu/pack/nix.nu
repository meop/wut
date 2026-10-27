# a bare name is nixpkgs' attribute of that name, which is what profile add and eval take; profile list, remove and
# upgrade name an element by its attribute alone
def packNixInstallable [raw: string] {
  $raw | split row ' ' | each { |w|
    if ($w | is-empty) or ($w | str starts-with '-') or ($w | str contains '#') { $w } else { $"nixpkgs#($w)" }
  } | str join ' '
}

def packNixHas [name: string] {
  let listed = (do { ^nix profile list --json } | complete)
  if $listed.exit_code != 0 {
    return false
  }
  ($name | split row '#' | last) in ($listed.stdout | from json | get elements | columns)
}

def --env packNix [] {
  let mgr = 'nix'
  if (packSkip $mgr) {
    return
  }

  # a profile is the user's own, so nothing here takes sudo
  match $env.PACK_OP {
    add => {
      load-env {PACK_ADD_NAMES: (packNameList 'PACK_ADD_NAMES' | each { |n| packNixInstallable $n })}
      packOpAdd [$mgr profile add]
    }
    info => {
      for term in (packInfoNames) {
        packDo [$mgr search (packNixInstallable $term) '^']
      }
    }
    list => {
      packOpList (packListCmd $mgr)
    }
    remove => {
      packOpRemove [$mgr profile remove]
    }
    sync => {
      packOpSync [$mgr profile upgrade --all] [$mgr profile upgrade]
    }
    tidy => {
      packOp [$mgr profile wipe-history]
      packOp [$mgr store gc]
    }
  }
}
