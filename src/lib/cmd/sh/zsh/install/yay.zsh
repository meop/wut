if type pacman > /dev/null; then
  echo -n '> install yay [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    output="${HOME}/.yay-bin"
    if [[ -d "${output}" ]]; then
      wutLogOp git -C "${output}" pull --prune '> /dev/null 2>&1'
      if [[ -z "${WUT_NO_RUN}" ]]; then
        git -C "${output}" pull --prune > /dev/null 2>&1
      fi
    else
      uri='https://aur.archlinux.org/yay-bin.git'
      wutLogOp git clone -q --depth 1 "${uri}" "${output}"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        git clone -q --depth 1 "${uri}" "${output}"
      fi
    fi

    (
      wutLogOp pushd "${output}"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        pushd "${output}"
      fi
      wutLogOp makepkg --install --syncdeps
      if [[ -z "${WUT_NO_RUN}" ]]; then
        makepkg --install --syncdeps
      fi
      wutLogOp popd
      if [[ -z "${WUT_NO_RUN}" ]]; then
        popd
      fi
    )
  fi
fi
