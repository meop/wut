if [[ "${SYS_CPU_ARCH}" == 'x86_64' ]]; then
  if [[ "$(SYS_OS_PLAT)" == 'Linux' ]]; then
    if [[ "${SYS_OS_DIST}" == 'debian' ]]; then
      DOTNET_VERSION=9.0

      # dotnet-sdk: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>
      # pwsh (amd64): <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>
      # pwsh (arm64): <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

      function install_packages_microsoft_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*packages.*microsoft.*com.*$' > /dev/null; then
          output="${HOME}/packages-microsoft-prod.deb"
          uri="https://packages.microsoft.com/config/${SYS_OS_DIST}/${SYS_OS_VER}/packages-microsoft-prod.deb"
          printOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
          if [[ -z "${NOOP}" ]]; then
            curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
          fi
          printOp sudo dpkg -i "${output}"
          if [[ -z "${NOOP}" ]]; then
            sudo dpkg -i "${output}"
          fi
          printOp rm "${output}"
          if [[ -z "${NOOP}" ]]; then
            rm "${output}"
          fi
        fi
      }

      read yn?'> install dotnet sdk [system]? (y/N) '
      if [[ "${yn}" == 'y' ]]; then
        install_packages_microsoft_repo
        printOp sudo apt update
        if [[ -z "${NOOP}" ]]; then
          sudo apt update
        fi
        printOp sudo apt install dotnet-sdk-${DOTNET_VERSION}
        if [[ -z "${NOOP}" ]]; then
          sudo apt install dotnet-sdk-${DOTNET_VERSION}
        fi
      fi

      read yn?'> install pwsh [system]? (y/N) '
      if [[ "${yn}" == 'y' ]]; then
        install_packages_microsoft_repo
        printOp sudo apt update
        if [[ -z "${NOOP}" ]]; then
          sudo apt update
        fi
        printOp sudo apt install powershell
        if [[ -z "${NOOP}" ]]; then
          sudo apt install powershell
        fi
      fi
    fi
  fi
fi
