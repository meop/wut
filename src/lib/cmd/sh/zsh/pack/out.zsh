if type apt > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> out packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt update
      if [[ "${WUT_PACKAGES}" ]]; then
        sudo apt update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo apt list --upgradable | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt list --upgradable | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo apt list --upgradable
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt list --upgradable
        fi
      fi
    else
      wutLogOp apt update
      if [[ "${WUT_PACKAGES}" ]]; then
        apt update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp apt list --upgradable | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          apt list --upgradable | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp apt list --upgradable
        if [[ -z "${WUT_NO_RUN}" ]]; then
          apt list --upgradable
        fi
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> out packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get update
      if [[ "${WUT_PACKAGES}" ]]; then
        sudo apt-get update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo apt-get list --upgradable | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt-get list --upgradable | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo apt-get list --upgradable
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt-get list --upgradable
        fi
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> out packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew update
    if [[ "${WUT_PACKAGES}" ]]; then
      brew update
    fi
    if [[ "${WUT_PACKAGES}" ]]; then
      wutLogOp brew outdated | grep --ignore-case $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        brew outdated | grep --ignore-case $WUT_PACKAGES
      fi
    else
      wutLogOp brew outdated
      if [[ -z "${WUT_NO_RUN}" ]]; then
        brew outdated
      fi
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> out packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf check-update
      if [[ "${WUT_PACKAGES}" ]]; then
        sudo dnf check-update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo dnf list --upgrades | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo dnf list --upgrades | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo dnf list --upgrades
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo dnf list --upgrades
        fi
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> out packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --sync --refresh
    if [[ "${WUT_PACKAGES}" ]]; then
      yay --sync --refresh
    fi
    if [[ "${WUT_PACKAGES}" ]]; then
      wutLogOp yay --query --upgrades | grep --ignore-case $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        yay --query --upgrades | grep --ignore-case $WUT_PACKAGES
      fi
    else
      wutLogOp yay --query --upgrades
      if [[ -z "${WUT_NO_RUN}" ]]; then
        yay --query --upgrades
      fi
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> out packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --sync --refresh
      if [[ "${WUT_PACKAGES}" ]]; then
        sudo pacman --sync --refresh
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo pacman --query --upgrades | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo pacman --query --upgrades | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo pacman --query --upgrades
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo pacman --query --upgrades
        fi
      fi
    else
      wutLogOp pacman --sync --refresh
      if [[ "${WUT_PACKAGES}" ]]; then
        pacman --sync --refresh
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp pacman --query --upgrades | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          pacman --query --upgrades | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp pacman --query --upgrades
        if [[ -z "${WUT_NO_RUN}" ]]; then
          pacman --query --upgrades
        fi
      fi
    fi
  fi
fi
