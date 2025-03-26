if [[ "${sys_cpu_arch}" == 'x86_64' ]]; then
  if [[ "$(sys_os_plat)" == 'Linux' ]]; then
    if [[ "${sys_os_dist}" == 'debian' ]]; then
      DOTNET_VERSION=9.0

      # dotnet-sdk: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>
      # pwsh (amd64): <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>
      # pwsh (arm64): <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

      function install_packages_microsoft_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*packages.*microsoft.*com.*$' > /dev/null; then
          _output="${HOME}/packages-microsoft-prod.deb"
          _url="https://packages.microsoft.com/config/${sys_os_dist}/${sys_os_ver}/packages-microsoft-prod.deb"
          runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
          runOp sudo dpkg -i "${_output}"
          runOp rm "${_output}"
        fi
      }

      read yn?'? install dotnet sdk [system] (y/N) '
      if [[ "${yn}" == 'y' ]]; then
        install_packages_microsoft_repo
        runOp sudo apt update
        runOp sudo apt install dotnet-sdk-${DOTNET_VERSION}
      fi

      read yn?'? install pwsh [system] (y/N) '
      if [[ "${yn}" == 'y' ]]; then
        install_packages_microsoft_repo
        runOp sudo apt update
        runOp sudo apt install powershell
      fi
    fi
  fi
fi
