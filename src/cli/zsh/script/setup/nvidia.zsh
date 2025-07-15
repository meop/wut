# https://developer.nvidia.com/cuda-downloads
function () {
  local yn=''
  if [[ $SYS_CPU_ARCH == 'x86_64' ]]; then
    if [[ $SYS_OS_PLAT == 'linux' ]]; then
      if [[ $SYS_OS_ID == 'debian' || $SYS_OS_ID == 'ubuntu' ]]; then
        if [[ $YES ]]; then
          yn='y'
        else
          read 'yn?? setup nvidia - install cuda toolkit (system) [y, [n]] '
        fi
        if [[ $yn != 'n' ]]; then
          function install_cuda_keyring {
            local cuda_keyring_ver='1.1-1'
            local output="${HOME}/cuda-keyring_${cuda_keyring_ver}_all.deb"
            local sys_os_ver_id_flat=$(echo "${SYS_OS_VER_ID}" | sed 's/\.//g')
            local url="https://developer.download.nvidia.com/compute/cuda/repos/${SYS_OS_ID}${sys_os_ver_id_flat}/${SYS_CPU_ARCH}/cuda-keyring_${cuda_keyring_ver}_all.deb"
            opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
            opPrintMaybeRunCmd sudo dpkg --install "${output}"
            opPrintMaybeRunCmd rm "${output}"
          }
          install_cuda_keyring
          local cuda_toolkit_ver='12-9'
          opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
          opPrintMaybeRunCmd sudo apt install cuda-toolkit-"${cuda_toolkit_ver}"
        fi
        if [[ $YES ]]; then
          yn='y'
        else
          read 'yn?? setup nvidia - install container toolkit (system) [y, [n]] '
        fi
        if [[ $yn != 'n' ]]; then
          function install_container_keyring {
            local output_gpg='/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg'
            local output='/etc/apt/sources.list.d/nvidia-container-toolkit.list'
            local url="https://nvidia.github.io/libnvidia-container"
            opPrintMaybeRunCmd sudo --preserve-env bash -c '"'curl --fail-with-body --location --no-progress-meter --url "${url}/gpgkey" '|' gpg --dearmor -o "${output_gpg}"'"'
            opPrintMaybeRunCmd sudo --preserve-env bash -c '"'curl --fail-with-body --location --no-progress-meter --url "${url}/stable/deb/nvidia-container-toolkit.list" '|' sed ''\'s#deb https://#deb '['signed-by="${output_gpg}"']' https://#g''\' '>' "${output}"'"'
          }
          install_container_keyring
          opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
          opPrintMaybeRunCmd sudo apt install nvidia-container-toolkit nvidia-container-toolkit-base libnvidia-container-tools libnvidia-container1
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
