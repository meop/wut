if not (lxcSetupHolds 'test -d /srv/code') {
  lxcSetupAsRoot 'mkdir -p /srv/code'
}
