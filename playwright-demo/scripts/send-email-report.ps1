param(
  [string]$WorkspaceRoot,
  [string]$TemplatePath,
  [string]$ScreensDir,
  [string]$PublicScreensBaseUrl,
  [string]$TempRoot,
  [string]$ToRecipients = 'lokesh.jain@absa.africa',
  [string]$CcRecipients = '',
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

  $suiteLinks = @()

  foreach ($suiteDir in Get-ChildItem -Path $SourceScreensDir -Directory -ErrorAction SilentlyContinue) {
    $destSuiteDir = Join-Path $DestinationScreensDir $suiteDir.Name
    New-Item -ItemType Directory -Path $destSuiteDir -Force | Out-Null

    $suitePngFiles = Get-ChildItem -Path $suiteDir.FullName -Filter *.png -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    $safeIndexRows = ''
    foreach ($img in $suitePngFiles) {
      Copy-Item -Path $img.FullName -Destination (Join-Path $destSuiteDir $img.Name) -Force
      $safeIndexRows += '<tr><td style="padding:8px 10px;border:1px solid #ddd;">' + $img.Name + '</td><td style="padding:8px 10px;border:1px solid #ddd;"><a href="' + $img.Name + '">Open</a></td><td style="padding:8px 10px;border:1px solid #ddd;"><a href="' + $img.Name + '"><img src="' + $img.Name + '" alt="' + $img.Name + '" style="max-width:240px;max-height:130px;border:1px solid #d9dee5;" /></a></td></tr>'
    }

    if ([string]::IsNullOrWhiteSpace($safeIndexRows)) {
      $safeIndexRows = '<tr><td colspan="3" style="padding:8px 10px;border:1px solid #ddd;">No screenshots found.</td></tr>'
    }

    $safeSuiteIndex = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + $suiteDir.Name + ' Screenshots</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:16px;"><div style="margin-bottom:12px;"><a href="../../index.html" style="text-decoration:none;color:#0d3d6b;font-size:13px;">&larr; Back to report</a></div><h2 style="margin-top:0;">' + $suiteDir.Name + ' - Screenshots</h2><table style="border-collapse:collapse;width:100%;max-width:980px;"><tr><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">File</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">View</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Preview</th></tr>' + $safeIndexRows + '</table></body></html>'
    Set-Content -Path (Join-Path $destSuiteDir 'index.html') -Value $safeSuiteIndex -Encoding UTF8

    $sourceSuiteIndex = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + $suiteDir.Name + ' Screenshots</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:16px;"><div style="margin-bottom:12px;"><a href="../index.html" style="text-decoration:none;color:#0d3d6b;font-size:13px;">&larr; Back to screenshots</a></div><h2 style="margin-top:0;">' + $suiteDir.Name + ' - Screenshots</h2><table style="border-collapse:collapse;width:100%;max-width:980px;"><tr><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">File</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">View</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Preview</th></tr>' + $safeIndexRows + '</table></body></html>'
    Set-Content -Path (Join-Path $suiteDir.FullName 'index.html') -Value $sourceSuiteIndex -Encoding UTF8

    $suiteLinks += '<tr><td style="padding:8px 10px;border:1px solid #ddd;">' + $suiteDir.Name + '</td><td style="padding:8px 10px;border:1px solid #ddd;">' + $suitePngFiles.Count + '</td><td style="padding:8px 10px;border:1px solid #ddd;"><a href="./' + $suiteDir.Name + '/index.html">Open</a></td></tr>'
  }

  if ($suiteLinks.Count -eq 0) {
    $suiteLinks = @('<tr><td colspan="3" style="padding:8px 10px;border:1px solid #ddd;">No screenshot suites found.</td></tr>')
  }

  $rootSourceIndex = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Playwright Screenshots</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:16px;"><h2 style="margin-top:0;">Playwright Screenshot Suites</h2><table style="border-collapse:collapse;width:100%;max-width:820px;"><tr><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Suite</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Images</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Open</th></tr>' + ($suiteLinks -join '') + '</table></body></html>'
  Set-Content -Path (Join-Path $SourceScreensDir 'index.html') -Value $rootSourceIndex -Encoding UTF8

  $rootSafeIndex = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Playwright Screenshots</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:16px;"><div style="margin-bottom:12px;"><a href="../index.html" style="text-decoration:none;color:#0d3d6b;font-size:13px;">&larr; Back to report</a></div><h2 style="margin-top:0;">Playwright Screenshot Suites</h2><table style="border-collapse:collapse;width:100%;max-width:820px;"><tr><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Suite</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Images</th><th style="text-align:left;padding:8px 10px;border:1px solid #ddd;background:#f2f5f8;">Open</th></tr>' + ($suiteLinks -join '') + '</table></body></html>'
  Set-Content -Path (Join-Path $DestinationScreensDir 'index.html') -Value $rootSafeIndex -Encoding UTF8
}

function To-FeatureName {
  param([string]$SuiteName)

  if ([string]::IsNullOrWhiteSpace($SuiteName)) { return 'Unknown' }

  $parts = $SuiteName -split '[-_]'
  $titleParts = @()
  foreach ($part in $parts) {
    if (-not [string]::IsNullOrWhiteSpace($part)) {
      $titleParts += (($part.Substring(0,1).ToUpper()) + $part.Substring(1).ToLower())
    }
  }
  return ($titleParts -join ' ')
}

function Get-TestRows {
  param(
    [object]$Suite,
    [string]$SuiteName,
    [string]$ScreensRoot,
    [string]$PublicScreensBaseUrl
  )

  $out = ''
  $featureName = To-FeatureName $SuiteName
  $suiteScreensDir = Join-Path $ScreensRoot $SuiteName
  $folderLink = 'N/A'

  $suiteIndexPath = Join-Path $suiteScreensDir 'index.html'

  if (Test-Path $suiteScreensDir) {
    if (-not [string]::IsNullOrWhiteSpace($PublicScreensBaseUrl)) {
      $baseUrl = $PublicScreensBaseUrl.TrimEnd('/')
      $suiteScreensHref = $baseUrl + '/' + $SuiteName + '/index.html'
    } else {
      $suiteScreensHref = ([System.Uri]([System.IO.Path]::GetFullPath($suiteIndexPath))).AbsoluteUri
    }
    $folderLink = '<a href="' + $suiteScreensHref + '" title="' + $suiteScreensDir + '" style="text-decoration:none;font-size:16px;">&#128193;</a>'
  }

  foreach ($spec in $Suite.specs) {
    foreach ($t in $spec.tests) {
      $tDur = if ($t.results -and $t.results.Count -gt 0) { [math]::Round($t.results[-1].duration / 1000, 1) } else { '-' }
      $rowFeatureName = $featureName

      if ($SuiteName -eq 'own-fund-transfer') {
        $titleText = ($spec.title + ' ' + $t.title).ToLower()
        if ($titleText -match 'local\s*to\s*local') {
          $rowFeatureName = 'Own Fund Transfer (Local to Local)'
        } elseif ($titleText -match 'eur\s*to\s*usd') {
          $rowFeatureName = 'Own Fund Transfer (EUR to USD)'
        }
      }

      if ($t.status -eq 'expected') {
        $rBg = '#f0faf0'; $badge = 'PASS'; $bClr = '#1b5e20'
      } elseif ($t.status -eq 'unexpected' -or $t.status -eq 'skipped') {
        # Business rule: skipped cases are shown as FAIL.
        $rBg = '#fff0f0'; $badge = 'FAIL'; $bClr = '#b71c1c'
      } else {
        $rBg = '#f5f5f5'; $badge = $t.status.ToUpper(); $bClr = '#555'
      }

      $out += '<tr style="background:' + $rBg + ';">'
      $out += '<td style="padding:8px 12px;border:1px solid #e0e0e0;line-height:18px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;">' + $rowFeatureName + '</td>'
      $out += '<td style="padding:8px 12px;border:1px solid #e0e0e0;line-height:18px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;">' + $SuiteName + '</td>'
      $out += '<td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;line-height:18px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;">' + $folderLink + '</td>'
      $out += '<td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;line-height:18px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;"><table cellpadding="0" cellspacing="0" border="0" align="center" role="presentation"><tr><td bgcolor="' + $bClr + '" style="background:' + $bClr + ';color:#fff;padding:3px 10px;font-size:11px;font-weight:bold;line-height:11px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;">' + $badge + '</td></tr></table></td>'
      $out += '<td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:right;line-height:18px;mso-line-height-rule:exactly;font-family:Consolas,Monaco,monospace;">' + $tDur + 's</td>'
      $out += '</tr>'
    }
  }

  foreach ($sub in $Suite.suites) {
    $out += Get-TestRows -Suite $sub -SuiteName $SuiteName -ScreensRoot $ScreensRoot -PublicScreensBaseUrl $PublicScreensBaseUrl
  }

  return $out
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

if ([string]::IsNullOrWhiteSpace($PublicScreensBaseUrl) -and -not [string]::IsNullOrWhiteSpace($env:PUBLIC_SCREENSHOTS_BASE_URL)) {
  $PublicScreensBaseUrl = $env:PUBLIC_SCREENSHOTS_BASE_URL
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
$localOffset = Get-Date -Format 'zzz'
$localDateStr = "$dateStr ($localOffset)"
$logoSrc = Get-LogoSource -RootPath $WorkspaceRoot
$resultsJsonPath = Join-Path $WorkspaceRoot 'playwright-demo\test-results\results.json'

$passed = 0
$failed = 0
$skipped = 0
$total = 0
$durSec = '-'
$rows = ''
$envDown = $false
$outageMessage = 'Service unavailable while executing login flow.'

if (Test-Path $resultsJsonPath) {
  try {
    $resultsRaw = Get-Content -Path $resultsJsonPath -Raw -Encoding UTF8
    $jData = $resultsRaw | ConvertFrom-Json

    $expectedCount = [int]$jData.stats.expected
    $unexpectedCount = [int]$jData.stats.unexpected
    $skippedCount = [int]$jData.stats.skipped

    # Business rule: skipped should be counted/displayed as failed.
    $passed = $expectedCount
    $failed = $unexpectedCount + $skippedCount
    $skipped = 0
    $total = $passed + $failed
    $durSec = [math]::Round($jData.stats.duration / 1000, 1)

    foreach ($suite in $jData.suites) {
      $suiteName = ($suite.title -replace '\.spec\.js$', '') -replace '^.*[/\\]', ''
      $rows += Get-TestRows -Suite $suite -SuiteName $suiteName -ScreensRoot $ScreensDir -PublicScreensBaseUrl $PublicScreensBaseUrl
    }

    $hasOutageText = $resultsRaw -match 'SERVICE_DOWN|unable to process your request temporarily|DOWN/UNAVAILABLE'
    if ($hasOutageText -and ($expectedCount + $unexpectedCount + $skippedCount) -gt 0 -and $skippedCount -eq ($expectedCount + $unexpectedCount + $skippedCount)) {
      $envDown = $true
    }

    $outageMatch = [regex]::Match($resultsRaw, 'unable to process your request temporarily[^\"]*', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($outageMatch.Success) {
      $outageMessage = $outageMatch.Value.Trim()
    }
  } catch {
    Write-Host 'Warning: could not parse results.json; using template defaults.'
    Write-Host $_.Exception.Message
  }
}

$pRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 0) } else { 0 }
$fRate = if ($total -gt 0) { [math]::Round(($failed / $total) * 100, 0) } else { 0 }
$sRate = 0

if ([string]::IsNullOrWhiteSpace($rows)) {
  $rows = '<tr><td colspan="5" style="padding:10px;border:1px solid #e0e0e0;text-align:center;color:#666;">No test case rows found.</td></tr>'
}

$bodyHtml = Get-Content -Path $TemplatePath -Raw -Encoding UTF8
$bodyHtml = $bodyHtml -replace 'src="playwright-demo/assets/absa-logo.png"', ('src="' + $logoSrc + '"')
$bodyHtml = [regex]::Replace($bodyHtml, '(?s)(<tr><td[^>]*>Execution Time</td><td[^>]*>).*?(</td></tr>)', ('${1}' + $localDateStr + '${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(?s)(<tr><td[^>]*>Total Duration</td><td[^>]*>).*?(</td></tr>)', ('${1}' + $durSec + ' s${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-pass-num"[^>]*>)0(</td>)', ('${1}' + $passed + '${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-pass-lbl"[^>]*>)PASSED \(0%\)(</td>)', ('${1}PASSED (' + $pRate + '%)${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-fail-num"[^>]*>)0(</td>)', ('${1}' + $failed + '${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-fail-lbl"[^>]*>)FAILED \(0%\)(</td>)', ('${1}FAILED (' + $fRate + '%)${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-skip-num"[^>]*>)5(</td>)', ('${1}' + $skipped + '${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-skip-lbl"[^>]*>)SKIPPED \(100%\)(</td>)', ('${1}SKIPPED (' + $sRate + '%)${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="kpi-total-num"[^>]*>)5(</td>)', ('${1}' + $total + '${2}'))
$bodyHtml = $bodyHtml -replace '&#9646; Pass 0%', ('&#9646; Pass ' + $pRate + '%')
$bodyHtml = $bodyHtml -replace '&#9646; Fail 0%', ('&#9646; Fail ' + $fRate + '%')
$bodyHtml = $bodyHtml -replace '&#9646; Skip 100%', ('&#9646; Skip ' + $sRate + '%')
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="bp" width=")[^"]*(")', ('${1}' + $pRate + '%${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="bf" width=")[^"]*(")', ('${1}' + $fRate + '%${2}'))
$bodyHtml = [regex]::Replace($bodyHtml, '(<td class="bs" width=")[^"]*(")', ('${1}' + $sRate + '%${2}'))
$bodyHtml = $bodyHtml.Replace('<!--ROWS_PLACEHOLDER-->', $rows)

if ($envDown) {
  $alertHtml = '<!--ALERT_BLOCK_START--><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td width="4" bgcolor="#c62828" style="background:#c62828;font-size:1px;line-height:1px;">&nbsp;</td><td bgcolor="#ead0d0" style="background:#ead0d0;padding:12px 16px;font-size:12px;color:#2d3136;font-family:Arial,Helvetica,sans-serif;line-height:18px;mso-line-height-rule:exactly;"><strong>&#9888; ENVIRONMENT ALERT - SERVICE UNAVAILABLE</strong><br><br><strong>&#128680; SC UAT Environment is DOWN/UNAVAILABLE</strong><br><br><strong>Service Error Message:</strong><br><em>"' + $outageMessage + '"</em><br><br><strong>&#9432; Status:</strong> All test cases are shown as failed because backend service was unavailable during login.<br><br><strong>&#9881; Action Required:</strong> Engage environment support and rerun once service is restored.</td></tr></table><!--ALERT_BLOCK_END-->'
  $bodyHtml = [regex]::Replace($bodyHtml, '(?s)<!--ALERT_BLOCK_START-->.*?<!--ALERT_BLOCK_END-->', $alertHtml)
} else {
  $alertHtml = '<!--ALERT_BLOCK_START--><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td width="4" bgcolor="#2e7d32" style="background:#2e7d32;font-size:1px;line-height:1px;">&nbsp;</td><td bgcolor="#e8f5e9" style="background:#e8f5e9;padding:12px 16px;font-size:12px;color:#1b5e20;font-family:Arial,Helvetica,sans-serif;line-height:18px;mso-line-height-rule:exactly;"><strong>ENVIRONMENT STATUS - AVAILABLE</strong><br><br><strong>SC UAT Environment is reachable.</strong><br><br><strong>Status:</strong> Tests executed normally. Review pass/fail summary above for result details.</td></tr></table><!--ALERT_BLOCK_END-->'
  $bodyHtml = [regex]::Replace($bodyHtml, '(?s)<!--ALERT_BLOCK_START-->.*?<!--ALERT_BLOCK_END-->', $alertHtml)
}

$noteHtml = '<!--NOTE_BLOCK_START--><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td width="4" bgcolor="#1f4e79" style="background:#1f4e79;font-size:1px;line-height:1px;">&nbsp;</td><td bgcolor="#d9e1e8" style="background:#d9e1e8;padding:12px 16px;font-size:12px;color:#2d3136;font-family:Arial,Helvetica,sans-serif;line-height:18px;mso-line-height-rule:exactly;"><strong>Sanitized Report Attached:</strong> A shareable ZIP is attached with only the summary report and screenshots. Playwright source, traces, and code-heavy artifacts are excluded for company policy compliance.</td></tr></table><!--NOTE_BLOCK_END-->'
$bodyHtml = [regex]::Replace($bodyHtml, '(?s)<!--NOTE_BLOCK_START-->.*?<!--NOTE_BLOCK_END-->', $noteHtml)

$safeReportDir = Join-Path $TempRoot 'sanitized-playwright-report'
$safeZipPath = Join-Path $TempRoot 'sanitized-playwright-report.zip'
$safeReportDir = [System.IO.Path]::GetFullPath($safeReportDir)
$safeZipPath = [System.IO.Path]::GetFullPath($safeZipPath)

if (Test-Path $safeReportDir) { Remove-Item $safeReportDir -Recurse -Force }
if (Test-Path $safeZipPath) { Remove-Item $safeZipPath -Force }

New-Item -ItemType Directory -Path $safeReportDir -Force | Out-Null
$safeScreensDir = Join-Path $safeReportDir 'screenshots'
New-Item -ItemType Directory -Path $safeScreensDir -Force | Out-Null

New-SuiteScreenshotIndexes -SourceScreensDir $ScreensDir -DestinationScreensDir $safeScreensDir

$attachmentHtml = [regex]::Replace($bodyHtml, 'href="file:///[^"]*/screenshots/([^"]+)"', 'href="screenshots/$1"')
$attachmentNoteHtml = '<!--NOTE_BLOCK_START--><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td width="4" bgcolor="#1f4e79" style="background:#1f4e79;font-size:1px;line-height:1px;">&nbsp;</td><td bgcolor="#d9e1e8" style="background:#d9e1e8;padding:12px 16px;font-size:12px;color:#2d3136;font-family:Arial,Helvetica,sans-serif;line-height:18px;mso-line-height-rule:exactly;"><strong>Sanitized Report Attached:</strong> This attachment contains only the summary page and screenshots. Playwright source, traces, and code-heavy artifacts are excluded for sharing compliance.</td></tr></table><!--NOTE_BLOCK_END-->'
$attachmentHtml = [regex]::Replace($attachmentHtml, '(?s)<!--NOTE_BLOCK_START-->.*?<!--NOTE_BLOCK_END-->', $attachmentNoteHtml)
Set-Content -Path (Join-Path $safeReportDir 'index.html') -Value $attachmentHtml -Encoding UTF8
Compress-Archive -Path "$safeReportDir\*" -DestinationPath $safeZipPath -Force

$subject = 'Auto Generated Mail | Playwright Automation Report | AIB-SC-UAT | ' + $localDateStr

Write-Host "Email diagnostics -> User: $env:USERNAME | Session: $env:SESSIONNAME | Host: $env:COMPUTERNAME"
Write-Host "Template path: $TemplatePath"
Write-Host "Screenshots dir: $ScreensDir"
Write-Host "Public screenshots base URL: $PublicScreensBaseUrl"
Write-Host "Attachment path: $safeZipPath"
Write-Host "EMAIL_TO=$ToRecipients"
Write-Host "EMAIL_CC=$CcRecipients"
Write-Host "RESULT_TOTAL=$total"
Write-Host "RESULT_PASSED=$passed"
Write-Host "RESULT_FAILED=$failed"
Write-Host "RESULT_SKIPPED=$skipped"
Write-Host "ENV_DOWN=$envDown"

if ($NoSend) {
  $renderedPreviewPath = Join-Path $WorkspaceRoot 'email-report-preview.generated.html'
  Set-Content -Path $renderedPreviewPath -Value $bodyHtml -Encoding UTF8
  Write-Host "PREVIEW_RENDERED_PATH=$renderedPreviewPath"
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
