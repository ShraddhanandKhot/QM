$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = if ($env:TEAM_HUB_PORT) { $env:TEAM_HUB_PORT } else { "8091" }
Set-Location (Split-Path -Parent $here)
node apps/team-hub/server.mjs $port
