pwsh -c "$(Invoke-WebRequest -ErrorAction Stop -ProgressAction SilentlyContinue -Uri "${env:REQ_URL_SH}")"
