$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$processes = @()

function Start-DevProcess {
  param(
    [string] $Name,
    [string] $Directory
  )

  $workingDirectory = Join-Path $root $Directory
  Write-Host "Starting $Name in $Directory..."

  return Start-Process `
    -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'dev') `
    -WorkingDirectory $workingDirectory `
    -NoNewWindow `
    -PassThru
}

try {
  $processes += Start-DevProcess -Name 'backend API' -Directory 'backend'
  $processes += Start-DevProcess -Name 'frontend app' -Directory 'frontend'

  Write-Host ''
  Write-Host 'CodVedha LMS dev servers are starting.'
  Write-Host 'Backend:  http://localhost:5000/api'
  Write-Host 'Frontend: http://localhost:3000'
  Write-Host 'Press Ctrl+C to stop both.'
  Write-Host ''

  while ($true) {
    foreach ($process in $processes) {
      if ($process.HasExited) {
        throw "A dev process exited with code $($process.ExitCode)."
      }
    }

    Start-Sleep -Seconds 1
  }
}
finally {
  foreach ($process in $processes) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force
    }
  }
}
