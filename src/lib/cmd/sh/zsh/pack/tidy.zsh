if type apt > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> tidy packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt autoclean
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt autoclean
      fi
      wutLogOp sudo apt autoremove
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt autoremove
      fi
    else
      wutLogOp apt autoclean
      if [[ -z "${WUT_NO_RUN}" ]]; then
        apt autoclean
      fi
      wutLogOp apt autoremove
      if [[ -z "${WUT_NO_RUN}" ]]; then
        apt autoremove
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> tidy packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get autoclean
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt-get autoclean
      fi
      wutLogOp sudo apt-get autoremove
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt-get autoremove
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> tidy packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew cleanup --prune=all
    if [[ -z "${WUT_NO_RUN}" ]]; then
      brew cleanup --prune=all
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> tidy packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf clean dbcache
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo dnf clean dbcache
      fi
      wutLogOp sudo dnf autoremove
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo dnf autoremove
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> tidy packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --sync --clean
    if [[ -z "${WUT_NO_RUN}" ]]; then
      yay --sync --clean
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> tidy packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --sync --clean
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo pacman --sync --clean
      fi
    else
      wutLogOp pacman --sync --clean
      if [[ -z "${WUT_NO_RUN}" ]]; then
        pacman --sync --clean
      fi
    fi
  fi
fi
