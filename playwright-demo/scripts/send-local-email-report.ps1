param(
  [switch]$NoSend
)

$sharedScriptPath = Join-Path $PSScriptRoot 'send-email-report.ps1'
& $sharedScriptPath -NoSend:$NoSend