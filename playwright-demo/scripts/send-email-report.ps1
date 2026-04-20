param(
  [string]$WorkspaceRoot,
  [string]$TemplatePath,
  [string]$ScreensDir,
  [string]$TempRoot,
  [string]$ToRecipients = 'Harshal.Shindhe@absa.africa;Santosh.Swain@absa.africa;Amruta.Matre@absa.africa;Puja.Rane@absa.africa;Shweta.Ghavare@absa.africa;Deepak.Sharma4@ltm.com',
  [string]$CcRecipients = 'lokesh.jain@absa.africa',
  [switch]$NoSend
)

$ErrorActionPreference = 'Stop'

function Get-DefaultWorkspaceRoot {
  $playwrightDemoRoot = Split-Path -Path $PSScriptRoot -Parent
  return Split-Path -Path $playwrightDemoRoot -Parent
}

function Get-LogoSource {
  param([string]$RootPath)

  $logoSrc = 'https://1000logos.net/wp-content/uploads/2022/09/Absa-logo.png'
  $logoPathCandidates = @(
    (Join-Path $RootPath 'playwright-demo/assets/absa-logo.png'),
    (Join-Path $RootPath 'assets/absa-logo.png')
  )

  $logoPath = $logoPathCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($logoPath) {
    $logoBytes = [System.IO.File]::ReadAllBytes($logoPath)
    $logoB64 = [System.Convert]::ToBase64String($logoBytes)
    return 'data:image/png;base64,' + $logoB64
  }

  return $logoSrc
}

function New-SuiteScreenshotIndexes {
  param(
    [string]$SourceScreensDir,
    [string]$DestinationScreensDir
  )

  if (-not (Test-Path $SourceScreensDir)) {
    return
  }

  foreach ($suiteDir in Get-ChildItem -Path $SourceScreensDir -Directory -ErrorAction SilentlyContinue) {
    $destSuiteDir = Join-Path $DestinationScreensDir $suiteDir.Name
    New-Item -ItemType Directory -Path $destSuiteDir -Force | Out-Null

    $suitePngFiles = Get-ChildItem -Path $suiteDir.FullName -Filter *.png -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    $safeIndexRows = ''
    foreach ($img in $suitePngFiles) {
      Copy-Item -Path $img.FullName -Destination (Join-Path $destSuiteDir $img.Name) -Force
      $safeIndexRows += '<tr><td style="padding:8px 10px;border:1px solid #ddd;">' + $img.Name + '</td><td style="padding:8px 10px;border:1px solid #ddd;"><a href="' + $img.Name + '">Open</a></td></tr>'
    }

    if ([string]::IsNullOrWhiteSpace($safeIndexRows)) {
      $safeIndexRows = '<tr><td colspan="2" style="padding:8px 10px;border:1px solid #ddd;">No screenshots found.</td></tr>'
    }

    $safeSuiteIndex = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + $suiteDir.Name + ' Screenshots</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:16px;"><div style="margin-bottom:12px;"><a href="../../index.html" style="text-decoration:none;color:#0d3d6b;font-size:13px;">&larr; Back to report</a></div><h2 style="margin-top:0;">' + $suiteDir.Name + ' - Screenshots</h2><table style="border-collapse:collapse;width:100%;max-width:900px;"><tr><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">File</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">View</th></tr>' + $safeIndexRows + '</table></body></html>'
    Set-Content -Path (Join-Path $destSuiteDir 'index.html') -Value $safeSuiteIndex -Encoding UTF8
  }
}

function Send-EmailViaSmtp {
  param(
    [string]$Subject,
    [string]$BodyHtml,
    [string]$AttachmentPath,
    [string]$ToList,
    [string]$CcList
  )

  if ([string]::IsNullOrWhiteSpace($env:SMTP_HOST) -or [string]::IsNullOrWhiteSpace($env:SMTP_USER) -or [string]::IsNullOrWhiteSpace($env:SMTP_PASS)) {
    return $false
  }

  $smtpPort = if ([string]::IsNullOrWhiteSpace($env:SMTP_PORT)) { 587 } else { [int]$env:SMTP_PORT }
  $smtpEnableSsl = if ([string]::IsNullOrWhiteSpace($env:SMTP_ENABLE_SSL)) { $true } else { [bool]::Parse($env:SMTP_ENABLE_SSL) }

  $smtpClient = New-Object System.Net.Mail.SmtpClient($env:SMTP_HOST, $smtpPort)
  $smtpClient.EnableSsl = $smtpEnableSsl
  $smtpClient.Credentials = New-Object System.Net.NetworkCredential($env:SMTP_USER, $env:SMTP_PASS)

  $msg = New-Object System.Net.Mail.MailMessage
  $msg.From = $env:SMTP_USER
  foreach ($addr in ($ToList -split ';')) { if (-not [string]::IsNullOrWhiteSpace($addr)) { $msg.To.Add($addr.Trim()) } }
  foreach ($addr in ($CcList -split ';')) { if (-not [string]::IsNullOrWhiteSpace($addr)) { $msg.CC.Add($addr.Trim()) } }
  $msg.Subject = $Subject
  $msg.Body = $BodyHtml
  $msg.IsBodyHtml = $true
  if (Test-Path $AttachmentPath) { $msg.Attachments.Add($AttachmentPath) | Out-Null }

  $smtpClient.Send($msg)
  Write-Host "Email sent via SMTP fallback: $Subject"
  return $true
}

function Send-EmailViaOutlook {
  param(
    [string]$Subject,
    [string]$BodyHtml,
    [string]$AttachmentPath,
    [string]$ToList,
    [string]$CcList
  )

  $outlook = New-Object -ComObject Outlook.Application
  $mail = $outlook.CreateItem(0)
  $senderSmtp = 'lokesh.jain@absa.africa'
  $sendAccount = $null

  foreach ($acc in $outlook.Session.Accounts) {
    if ($acc.SmtpAddress -and $acc.SmtpAddress.ToLower() -eq $senderSmtp) {
      $sendAccount = $acc
      break
    }
  }

  if ($sendAccount -ne $null) {
    $mail.SendUsingAccount = $sendAccount
    Write-Host "Using Outlook account: $($sendAccount.SmtpAddress)"
  } else {
    Write-Host "Warning: Outlook account $senderSmtp not found in current profile; using default account."
  }

  $mail.To = $ToList
  $mail.CC = $CcList
  $mail.Subject = $Subject
  $mail.HTMLBody = $BodyHtml
  if (Test-Path $AttachmentPath) { $mail.Attachments.Add($AttachmentPath) | Out-Null }
  $mail.Send()
  Write-Host "Email sent via Outlook: $Subject"
  return $true
}

if ([string]::IsNullOrWhiteSpace($WorkspaceRoot)) {
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_WORKSPACE)) {
    $WorkspaceRoot = $env:GITHUB_WORKSPACE
  } else {
    $WorkspaceRoot = Get-DefaultWorkspaceRoot
  }
}

if ([string]::IsNullOrWhiteSpace($TemplatePath)) {
  $TemplatePath = Join-Path $WorkspaceRoot 'email-report-preview.html'
}

if ([string]::IsNullOrWhiteSpace($ScreensDir)) {
  $ScreensDir = Join-Path $WorkspaceRoot 'playwright-demo\screenshots'
}

if ([string]::IsNullOrWhiteSpace($TempRoot)) {
  if (-not [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) {
    $TempRoot = $env:RUNNER_TEMP
  } else {
    $TempRoot = Join-Path $WorkspaceRoot 'playwright-demo\test-results'
  }
}

if (-not (Test-Path $TemplatePath)) {
  throw "Template file not found: $TemplatePath"
}

$dateStr = Get-Date -Format 'dd MMM yyyy HH:mm'
$logoSrc = Get-LogoSource -RootPath $WorkspaceRoot

$bodyHtml = Get-Content -Path $TemplatePath -Raw -Encoding UTF8
$bodyHtml = $bodyHtml -replace 'src="playwright-demo/assets/absa-logo.png"', ('src="' + $logoSrc + '"')
$bodyHtml = $bodyHtml -replace '(?s)<div class="note">.*?</div>', '<div class="note"><strong>Policy Notice:</strong> Report ZIP attachment is intentionally removed as per company policy. Email includes the approved summary layout and environment error statement.</div>'

$safeReportDir = Join-Path $TempRoot 'sanitized-playwright-report'
$safeZipPath = Join-Path $TempRoot 'sanitized-playwright-report.zip'

if (Test-Path $safeReportDir) { Remove-Item $safeReportDir -Recurse -Force }
if (Test-Path $safeZipPath) { Remove-Item $safeZipPath -Force }

New-Item -ItemType Directory -Path $safeReportDir -Force | Out-Null
$safeScreensDir = Join-Path $safeReportDir 'screenshots'
New-Item -ItemType Directory -Path $safeScreensDir -Force | Out-Null

New-SuiteScreenshotIndexes -SourceScreensDir $ScreensDir -DestinationScreensDir $safeScreensDir

$attachmentHtml = [regex]::Replace($bodyHtml, 'href="file:///[^"]*/screenshots/([^"]+)"', 'href="screenshots/$1"')
$attachmentHtml = [regex]::Replace($attachmentHtml, '(?s)<div class="note">.*?</div>', '<div class="note"><strong>Sanitized Report Attached:</strong> This attachment contains only the summary page and screenshots. Playwright source, traces, and code-heavy artifacts are excluded for sharing compliance.</div>')
Set-Content -Path (Join-Path $safeReportDir 'index.html') -Value $attachmentHtml -Encoding UTF8
Compress-Archive -Path "$safeReportDir\*" -DestinationPath $safeZipPath -Force

$subject = 'Auto Generated Mail | Playwright Automation Report | AIB-SC-UAT | ' + $dateStr + ' UTC'

Write-Host "Email diagnostics -> User: $env:USERNAME | Session: $env:SESSIONNAME | Host: $env:COMPUTERNAME"
Write-Host "Template path: $TemplatePath"
Write-Host "Screenshots dir: $ScreensDir"
Write-Host "Attachment path: $safeZipPath"
Write-Host "EMAIL_TO=$ToRecipients"
Write-Host "EMAIL_CC=$CcRecipients"

if ($NoSend) {
  Write-Host 'EMAIL_STATUS=PREVIEW_ONLY'
  Write-Host 'EMAIL_TEMPLATE_MODE=SHARED'
  exit 0
}

$emailSent = $false

try {
  $emailSent = Send-EmailViaSmtp -Subject $subject -BodyHtml $bodyHtml -AttachmentPath $safeZipPath -ToList $ToRecipients -CcList $CcRecipients
} catch {
  Write-Host 'Warning: SMTP email send failed.'
  Write-Host $_.Exception.Message
}

if (-not $emailSent) {
  try {
    $emailSent = Send-EmailViaOutlook -Subject $subject -BodyHtml $bodyHtml -AttachmentPath $safeZipPath -ToList $ToRecipients -CcList $CcRecipients
  } catch {
    Write-Host 'Warning: Could not send email via Outlook.'
    Write-Host $_.Exception.Message
  }
}

if (-not $emailSent) {
  Write-Host 'Warning: No email was sent. Configure SMTP_* secrets for fallback or run in an interactive Outlook session.'
  exit 1
}

Write-Host 'EMAIL_STATUS=SENT'
Write-Host 'EMAIL_TEMPLATE_MODE=SHARED'