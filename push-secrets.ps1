# =============================================================
# push-secrets.ps1
# Reads playwright-demo/.env and uploads all variables
# as GitHub repository secrets in one command.
#
# Usage:
#   .\push-secrets.ps1 -Token "YOUR_GITHUB_PAT_TOKEN"
#
# How to get a token:
#   1. Go to https://github.com/settings/tokens
#   2. Click "Generate new token (classic)"
#   3. Give it a name, set expiry, tick "repo" scope
#   4. Click "Generate token" and copy it
# =============================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$Token
)

$owner = "AB021S5"
$repo  = "test"
$envFile = Join-Path $PSScriptRoot "playwright-demo\.env"

if (-not (Test-Path $envFile)) {
    Write-Error "Could not find .env file at: $envFile"
    exit 1
}

# ── Step 1: Get the repo's public key (needed to encrypt secrets) ────────────
$headers = @{
    Authorization            = "Bearer $Token"
    Accept                   = "application/vnd.github+json"
    "X-GitHub-Api-Version"   = "2022-11-28"
}

$keyUrl = "https://api.github.com/repos/$owner/$repo/actions/secrets/public-key"
try {
    $keyInfo = Invoke-RestMethod -Uri $keyUrl -Headers $headers -Method Get
} catch {
    Write-Error "Failed to fetch repo public key. Check your token and repo name. Error: $_"
    exit 1
}

# ── Step 2: Load libsodium for encryption ────────────────────────────────────
# GitHub requires secrets to be encrypted with the repo's public key using
# libsodium (crypto_box_seal). We use the .NET NaCl port via NuGet.
$libPath = Join-Path $env:TEMP "Sodium.Core.dll"
if (-not (Test-Path $libPath)) {
    Write-Host "Downloading Sodium.Core for secret encryption..."
    $nupkgUrl = "https://www.nuget.org/api/v2/package/Sodium.Core/1.3.4"
    $nupkg = Join-Path $env:TEMP "sodium.nupkg"
    Invoke-WebRequest -Uri $nupkgUrl -OutFile $nupkg -UseBasicParsing
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($nupkg)
    $entry = $zip.Entries | Where-Object { $_.FullName -match "lib/net.*?/Sodium\.Core\.dll" } | Select-Object -First 1
    if ($null -eq $entry) {
        $zip.Dispose()
        Write-Error "Could not find Sodium.Core.dll inside the NuGet package."
        exit 1
    }
    $stream = $entry.Open()
    $outStream = [System.IO.File]::Create($libPath)
    $stream.CopyTo($outStream)
    $outStream.Close(); $stream.Close(); $zip.Dispose()
}
Add-Type -Path $libPath

function Encrypt-Secret {
    param([string]$PublicKeyBase64, [string]$SecretValue)
    $keyBytes    = [Convert]::FromBase64String($PublicKeyBase64)
    $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($SecretValue)
    $sealed      = [Sodium.SealedPublicKeyBox]::Create($secretBytes, $keyBytes)
    return [Convert]::ToBase64String($sealed)
}

# ── Step 3: Read .env and upload each variable as a secret ───────────────────
$lines = Get-Content $envFile | Where-Object { $_ -match "^\s*[^#]\w+=.+" }
$count = 0

foreach ($line in $lines) {
    $parts = $line -split "=", 2
    $name  = $parts[0].Trim()
    $value = $parts[1].Trim()

    # Skip HEADLESS — workflow always sets this to true itself
    if ($name -eq "HEADLESS") { continue }

    $encrypted = Encrypt-Secret -PublicKeyBase64 $keyInfo.key -SecretValue $value

    $body = @{
        encrypted_value = $encrypted
        key_id          = $keyInfo.key_id
    } | ConvertTo-Json

    $secretUrl = "https://api.github.com/repos/$owner/$repo/actions/secrets/$name"
    try {
        Invoke-RestMethod -Uri $secretUrl -Headers $headers -Method Put -Body $body -ContentType "application/json" | Out-Null
        Write-Host "  Uploaded: $name"
        $count++
    } catch {
        Write-Warning "  Failed: $name — $_"
    }
}

Write-Host ""
Write-Host "$count secret(s) uploaded to https://github.com/$owner/$repo"
