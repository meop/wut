arch=$(uname -m)

plat=$(uname)

fullUrl="${urlStr}?arch=${arch}&plat=${plat}"

if [[ -f /etc/os-release ]]; then
  OS_ID=$(grep -Po '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
  fullUrl="${fullUrl}&dist=${OS_ID}"
fi
