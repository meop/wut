function () {
  local yn

  if [[ "${sys_cpu_arch}" == 'x86_64' ]]; then
    if [[ "$(sys_os_plat)" == 'linux' ]]; then
      if [[ "${sys_os_dist}" == 'debian' ]]; then
        # dotnet-sdk: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>
        # pwsh (amd64): <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>
        # pwsh (arm64): <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

        function install_packages_microsoft_repo {
          if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*packages.*microsoft.*com.*$' > /dev/null; then
            local output="${HOME}/packages-microsoft-prod.deb"
            local url="https://packages.microsoft.com/config/${sys_os_dist}/${sys_os_ver}/packages-microsoft-prod.deb"
            dynOp curl --location --silent --url "${url}" --create-dirs --output "${output}"
            dynOp sudo dpkg --install "${output}"
            dynOp rm "${output}"
          fi
        }

        function () {
          local version=9.0

          read yn?'? install dotnet sdk (system) [[y]/n] '
          if [[ "${yn}" == 'y' ]]; then
            install_packages_microsoft_repo
            dynOp sudo apt update
            dynOp sudo apt install dotnet-sdk-"${version}"
          fi
        }

        read yn?'? install pwsh (system) [[y]/n] '
        if [[ "${yn}" == 'y' ]]; then
          install_packages_microsoft_repo
          dynOp sudo apt update
          dynOp sudo apt install powershell
        fi
      fi
    fi
  fi
}
