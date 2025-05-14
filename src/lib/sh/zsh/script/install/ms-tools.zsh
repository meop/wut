function () {
  local yn=''

  if [[ $SYS_CPU_ARCH == 'x86_64' ]]; then
    if [[ $SYS_OS_PLAT == 'linux' ]]; then
      if [[ $SYS_OS_ID == 'debian' ]]; then
        # dotnet-sdk: <https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian>
        # pwsh (x86_64): <https://learn.microsoft.com/en-us/powershell/scripting/install/install-debian>
        # pwsh (aarch64): <https://learn.microsoft.com/en-us/powershell/scripting/install/community-support>

        function install_packages_microsoft_repo {
          if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*packages.*microsoft.*com.*$' > /dev/null; then
            local output="${HOME}/packages-microsoft-prod.deb"
            local url="https://packages.microsoft.com/config/${SYS_OS_ID}/${SYS_OS_VER_ID}/packages-microsoft-prod.deb"
            opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
            opPrintMaybeRunCmd sudo dpkg --install "${output}"
            opPrintMaybeRunCmd rm "${output}"
          fi
        }

        function () {
          local version=9.0

          read 'yn?? install dotnet sdk (system) [y, [n]] '
          if [[ $yn != 'n' ]]; then
            install_packages_microsoft_repo
            opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
            opPrintMaybeRunCmd sudo apt install dotnet-sdk-"${version}"
          fi
        }

        if [[ $YES ]]; then
          yn='y'
        else
          read 'yn?? install pwsh (system) [y, [n]] '
        fi
        if [[ $yn != 'n' ]]; then
          install_packages_microsoft_repo
          opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
          opPrintMaybeRunCmd sudo apt install powershell
        fi
      else
        echo 'script is for debian'
      fi
    else
      echo 'script is for linux'
    fi
  else
    echo 'script is for x86_64'
  fi
}
