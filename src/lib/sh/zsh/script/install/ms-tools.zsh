function () {
  local yn

  if [[ "${SYS_CPU_ARCH}" == 'x86_64' ]]; then
    if [[ "${SYS_OS_PLAT}" == 'linux' ]]; then
      if [[ "${sys_os}" == 'debian' ]]; then
        # dotnet-sdk: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>
        # pwsh (amd64): <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>
        # pwsh (arm64): <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

        function install_packages_microsoft_repo {
          if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*packages.*microsoft.*com.*$' > /dev/null; then
            local output="${HOME}/packages-microsoft-prod.deb"
            local url="https://packages.microsoft.com/config/${sys_os}/${sys_os_ver_id}/packages-microsoft-prod.deb"
            shRunOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
            shRunOpCond sudo dpkg --install "${output}"
            shRunOpCond rm "${output}"
          fi
        }

        function () {
          local version=9.0

          read yn?'? install dotnet sdk (system) [y, [n]] '
          if [[ "${yn}" != 'n' ]]; then
            install_packages_microsoft_repo
            shRunOpCond sudo apt update
            shRunOpCond sudo apt install dotnet-sdk-"${version}"
          fi
        }

        if [[ "${YES}" ]]; then
          yn='y'
        else
          read yn?'? install pwsh (system) [y, [n]] '
        fi
        if [[ "${yn}" != 'n' ]]; then
          install_packages_microsoft_repo
          shRunOpCond sudo apt update
          shRunOpCond sudo apt install powershell
        fi
      fi
    fi
  fi
}
