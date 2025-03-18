if [[ "${WUT_CPU_ARCH}" == 'x86_64' ]]; then
  if [[ "$(WUT_OS_PLAT)" == 'Linux' ]]; then
    if [[ "${WUT_OS_DIST}" == 'debian' ]]; then
      DOTNET_VERSION=9.0

      # dotnet-sdk: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>
      # pwsh (amd64): <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>
      # pwsh (arm64): <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

      function install_packages_microsoft_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*packages.*microsoft.*com.*$' > /dev/null; then
          output="${HOME}/packages-microsoft-prod.deb"
          uri="https://packages.microsoft.com/config/${WUT_OS_DIST}/${WUT_OS_VER}/packages-microsoft-prod.deb"
          wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
          if [[ -z "${WUT_NO_RUN}" ]]; then
            curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
          fi
          wutLogOp sudo dpkg -i "${output}"
          if [[ -z "${WUT_NO_RUN}" ]]; then
            sudo dpkg -i "${output}"
          fi
          wutLogOp rm "${output}"
          if [[ -z "${WUT_NO_RUN}" ]]; then
            rm "${output}"
          fi
        fi
      }

      echo -n '> install dotnet sdk [system]? (y/N) '
      read yn
      if [[ "${yn}" == 'y' ]]; then
        install_packages_microsoft_repo
        wutLogOp sudo apt update
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt update
        fi
        wutLogOp sudo apt install dotnet-sdk-${DOTNET_VERSION}
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt install dotnet-sdk-${DOTNET_VERSION}
        fi
      fi

      echo -n '> install pwsh [system]? (y/N) '
      read yn
      if [[ "${yn}" == 'y' ]]; then
        install_packages_microsoft_repo
        wutLogOp sudo apt update
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt update
        fi
        wutLogOp sudo apt install powershell
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt install powershell
        fi
      fi
    fi
  fi
fi
