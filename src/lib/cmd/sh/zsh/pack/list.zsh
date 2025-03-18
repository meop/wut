if type apt > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> list packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo apt list --installed | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt list --installed | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo apt list --installed
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt list --installed
        fi
      fi
    else
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp apt list --installed | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          apt list --installed | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp apt list --installed
        if [[ -z "${WUT_NO_RUN}" ]]; then
          apt list --installed
        fi
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> list packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo apt-get list --installed | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt-get list --installed | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo apt-get list --installed
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt-get list --installed
        fi
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> list packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ "${WUT_PACKAGES}" ]]; then
      wutLogOp brew list | grep --ignore-case $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        brew list | grep --ignore-case $WUT_PACKAGES
      fi
    else
      wutLogOp brew list
      if [[ -z "${WUT_NO_RUN}" ]]; then
        brew list
      fi
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> list packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo dnf list --installed | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo dnf list --installed | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo dnf list --installed
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo dnf list --installed
        fi
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> list packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ "${WUT_PACKAGES}" ]]; then
      wutLogOp yay --query | grep --ignore-case $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        yay --query | grep --ignore-case $WUT_PACKAGES
      fi
    else
      wutLogOp yay --query
      if [[ -z "${WUT_NO_RUN}" ]]; then
        yay --query
      fi
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> list packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo pacman --query | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo pacman --query | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp sudo pacman --query
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo pacman --query
        fi
      fi
    else
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp pacman --query | grep --ignore-case $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          pacman --query | grep --ignore-case $WUT_PACKAGES
        fi
      else
        wutLogOp pacman --query
        if [[ -z "${WUT_NO_RUN}" ]]; then
          pacman --query
        fi
      fi
    fi
  fi
fi
