function () {
  if [[ $SYS_OS_PLAT != darwin && $SYS_OS_PLAT != linux ]]; then
    opPrintWarn 'script is for darwin or linux'
    return
  fi

  export WUT_HOME="${WUT_HOME:-${HOME}/.wut}"
  local wut_home="${WUT_HOME}"
  local nu_bin="${wut_home}/vendor/nu"
  local nu_vers="${NU_VERS_MAJOR}.${NU_VERS_MINOR}.${NU_VERS_PATCH}"

  function nu_vers_current {
    [[ -x "${nu_bin}" ]] && [[ "$("${nu_bin}" --version 2> /dev/null)" == "${nu_vers}" ]]
  }

  function nu_lock_release {
    rmdir "${lock_dir}" 2> /dev/null
    # best-effort: only removes it if now empty, so a concurrent process's own in-flight files are never touched
    rmdir "${lock_dir:h}" 2> /dev/null
  }

  function nu_sync {
    if nu_vers_current; then
      return
    fi

    local triple=''
    case "${SYS_OS_PLAT}_${SYS_CPU_ARCH}" in
      darwin_aarch64) triple='aarch64-apple-darwin' ;;
      darwin_x86_64) triple='x86_64-apple-darwin' ;;
      linux_aarch64) triple='aarch64-unknown-linux-gnu' ;;
      linux_x86_64) triple='x86_64-unknown-linux-gnu' ;;
      *)
        opPrintErr "unsupported platform/arch for nu sync: ${SYS_OS_PLAT}/${SYS_CPU_ARCH}"
        exit 1
        ;;
    esac

    # a hidden dir nested inside bin (not bin itself) so a fresh download can never collide with the pinned nu_bin path
    local work_dir="${wut_home}/vendor/.nu"
    mkdir -p "${work_dir}"

    local lock_dir="${work_dir}/nu.lock"
    local acquired=0
    local waited=0
    while (( waited < 240 )); do
      if nu_vers_current; then
        return
      fi
      if mkdir "${lock_dir}" 2> /dev/null; then
        acquired=1
        break
      fi
      sleep 0.5
      waited=$(( waited + 1 ))
    done
    if (( ! acquired )); then
      opPrintWarn "reclaiming stale nu sync lock: ${lock_dir}"
      rmdir "${lock_dir}" 2> /dev/null
      if ! mkdir "${lock_dir}" 2> /dev/null; then
        opPrintErr "failed to acquire nu sync lock: ${lock_dir}"
        exit 1
      fi
    fi

    if nu_vers_current; then
      nu_lock_release
      return
    fi

    local asset="nu-${nu_vers}-${triple}.tar.gz"
    local url="https://github.com/nushell/nushell/releases/download/${nu_vers}/${asset}"
    local archive_path="${work_dir}/${asset}"
    local extract_dir="${work_dir}/nu-${nu_vers}-${triple}"

    rm -rf "${archive_path}" "${extract_dir}"

    if ! curl --fail-with-body --location --no-progress-meter --output "${archive_path}" --url "${url}"; then
      opPrintErr "failed to download nu ${nu_vers}: ${url}"
      rm -f "${archive_path}"
      nu_lock_release
      exit 1
    fi

    if ! tar -xzf "${archive_path}" -C "${work_dir}"; then
      opPrintErr "failed to extract nu ${nu_vers}"
      rm -rf "${archive_path}" "${extract_dir}"
      nu_lock_release
      exit 1
    fi

    if [[ ! -f "${extract_dir}/nu" ]]; then
      opPrintErr "nu binary not found in extracted archive: ${extract_dir}"
      rm -rf "${archive_path}" "${extract_dir}"
      nu_lock_release
      exit 1
    fi

    chmod +x "${extract_dir}/nu"
    mv -f "${extract_dir}/nu" "${nu_bin}"
    rm -rf "${archive_path}" "${extract_dir}"
    # a copy from before nu was vendored, in a dir that is on PATH
    rm -f "${wut_home}/bin/nu"

    nu_lock_release
  }

  nu_sync
}
