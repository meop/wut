# https://learn.microsoft.com/en-us/dotnet/core/install/
# https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell
function () {
  local yn=''
  if [[ $SYS_CPU_ARCH == 'x86_64' ]]; then
    if [[ $SYS_OS_PLAT == 'linux' ]]; then
      if [[ $SYS_OS_ID == 'debian' || $SYS_OS_ID == 'ubuntu' ]]; then
        function install_packages_microsoft_repo {
          local output="${HOME}/packages-microsoft-prod.deb"
          local url="https://packages.microsoft.com/config/${SYS_OS_ID}/${SYS_OS_VER_ID}/packages-microsoft-prod.deb"
          opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
          opPrintMaybeRunCmd sudo dpkg --install "${output}"
          opPrintMaybeRunCmd rm "${output}"
        }
        if [[ $YES ]]; then
          yn='y'
        else
          read 'yn?? install ms-tools dotnet sdk (system) [y, [n]] '
        fi
        if [[ $yn != 'n' ]]; then
          local dotnet_sdk_ver='9.0'
          if [[ $SYS_OS_ID == 'debian' ]]; then
            install_packages_microsoft_repo
          elif [[ $SYS_OS_ID == 'ubuntu' ]]; then
            opPrintMaybeRunCmd sudo add-apt-repository ppa:dotnet/backports
          fi
          opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
          opPrintMaybeRunCmd sudo apt install dotnet-sdk-"${dotnet_sdk_ver}"
        fi
        if [[ $YES ]]; then
          yn='y'
        else
          read 'yn?? install ms-tools pwsh (system) [y, [n]] '
        fi
        if [[ $yn != 'n' ]]; then
          install_packages_microsoft_repo
          opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
          opPrintMaybeRunCmd sudo apt install powershell
        fi
      else
        echo 'script is for debian/ubuntu'
      fi
    else
      echo 'script is for linux'
    fi
  else
    echo 'script is for x86_64'
  fi
}
