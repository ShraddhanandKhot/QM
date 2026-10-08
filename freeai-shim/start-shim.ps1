$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-Content (Join-Path $here ".env") | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k,$v = $_ -split '=',2
  [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), "Process")
}
Set-Location (Split-Path -Parent $here)
node freeai-shim/shim.mjs >> freeai-shim/shim.log 2>&1
