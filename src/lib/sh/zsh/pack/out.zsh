if type apt > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> out packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt update
      if [[ "${WUT_PACK_NAMES}" ]]; then
        sudo apt update
      fi
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo apt list --upgradable | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt list --upgradable | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo apt list --upgradable
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt list --upgradable
        fi
      fi
    else
      wutLogOp apt update
      if [[ "${WUT_PACK_NAMES}" ]]; then
        apt update
      fi
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp apt list --upgradable | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          apt list --upgradable | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp apt list --upgradable
        if [[ -z "${WUT_NOOP}" ]]; then
          apt list --upgradable
        fi
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> out packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get update
      if [[ "${WUT_PACK_NAMES}" ]]; then
        sudo apt-get update
      fi
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo apt-get list --upgradable | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt-get list --upgradable | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo apt-get list --upgradable
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt-get list --upgradable
        fi
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> out packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew update
    if [[ "${WUT_PACK_NAMES}" ]]; then
      brew update
    fi
    if [[ "${WUT_PACK_NAMES}" ]]; then
      wutLogOp brew outdated | grep --ignore-case $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        brew outdated | grep --ignore-case $WUT_PACK_NAMES
      fi
    else
      wutLogOp brew outdated
      if [[ -z "${WUT_NOOP}" ]]; then
        brew outdated
      fi
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> out packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf check-update
      if [[ "${WUT_PACK_NAMES}" ]]; then
        sudo dnf check-update
      fi
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo dnf list --upgrades | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo dnf list --upgrades | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo dnf list --upgrades
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo dnf list --upgrades
        fi
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> out packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --sync --refresh
    if [[ "${WUT_PACK_NAMES}" ]]; then
      yay --sync --refresh
    fi
    if [[ "${WUT_PACK_NAMES}" ]]; then
      wutLogOp yay --query --upgrades | grep --ignore-case $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        yay --query --upgrades | grep --ignore-case $WUT_PACK_NAMES
      fi
    else
      wutLogOp yay --query --upgrades
      if [[ -z "${WUT_NOOP}" ]]; then
        yay --query --upgrades
      fi
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> out packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --sync --refresh
      if [[ "${WUT_PACK_NAMES}" ]]; then
        sudo pacman --sync --refresh
      fi
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo pacman --query --upgrades | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo pacman --query --upgrades | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo pacman --query --upgrades
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo pacman --query --upgrades
        fi
      fi
    else
      wutLogOp pacman --sync --refresh
      if [[ "${WUT_PACK_NAMES}" ]]; then
        pacman --sync --refresh
      fi
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp pacman --query --upgrades | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          pacman --query --upgrades | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp pacman --query --upgrades
        if [[ -z "${WUT_NOOP}" ]]; then
          pacman --query --upgrades
        fi
      fi
    fi
  fi
fi
