if type apt > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> list packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo apt list --installed | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt list --installed | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo apt list --installed
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt list --installed
        fi
      fi
    else
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp apt list --installed | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          apt list --installed | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp apt list --installed
        if [[ -z "${WUT_NOOP}" ]]; then
          apt list --installed
        fi
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> list packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo apt-get list --installed | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt-get list --installed | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo apt-get list --installed
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo apt-get list --installed
        fi
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> list packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ "${WUT_PACK_NAMES}" ]]; then
      wutLogOp brew list | grep --ignore-case $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        brew list | grep --ignore-case $WUT_PACK_NAMES
      fi
    else
      wutLogOp brew list
      if [[ -z "${WUT_NOOP}" ]]; then
        brew list
      fi
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> list packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo dnf list --installed | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo dnf list --installed | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo dnf list --installed
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo dnf list --installed
        fi
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> list packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ "${WUT_PACK_NAMES}" ]]; then
      wutLogOp yay --query | grep --ignore-case $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        yay --query | grep --ignore-case $WUT_PACK_NAMES
      fi
    else
      wutLogOp yay --query
      if [[ -z "${WUT_NOOP}" ]]; then
        yay --query
      fi
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> list packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp sudo pacman --query | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo pacman --query | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp sudo pacman --query
        if [[ -z "${WUT_NOOP}" ]]; then
          sudo pacman --query
        fi
      fi
    else
      if [[ "${WUT_PACK_NAMES}" ]]; then
        wutLogOp pacman --query | grep --ignore-case $WUT_PACK_NAMES
        if [[ -z "${WUT_NOOP}" ]]; then
          pacman --query | grep --ignore-case $WUT_PACK_NAMES
        fi
      else
        wutLogOp pacman --query
        if [[ -z "${WUT_NOOP}" ]]; then
          pacman --query
        fi
      fi
    fi
  fi
fi
