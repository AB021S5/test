# push-secrets.ps1
# Reads playwright-demo/.env and uploads variables as GitHub repository secrets.
# Usage: .\push-secrets.ps1 -Token "YOUR_GITHUB_PAT_TOKEN"

param(
        [Parameter(Mandatory = $true)]
        [string]$Token,

        [string]$Owner = "AB021S5",
        [string]$Repo = "test"
)

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "playwright-demo\.env"
if (-not (Test-Path $envFile)) {
        Write-Error "Could not find .env file at: $envFile"
        exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is required but was not found in PATH."
        exit 1
}

Push-Location $PSScriptRoot
try {
        Write-Host "Installing libsodium-wrappers (no-save) if needed..."
        npm install --no-save libsodium-wrappers | Out-Null

        $env:GITHUB_TOKEN = $Token
        $env:GITHUB_OWNER = $Owner
        $env:GITHUB_REPO = $Repo
        $env:ENV_FILE_PATH = $envFile

        $nodeScript = @'
const fs = require("fs");
const sodium = require("libsodium-wrappers");

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const envFile = process.env.ENV_FILE_PATH;

function parseEnv(text) {
    const result = {};
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx <= 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        result[key] = value;
    }
    return result;
}

async function ghRequest(url, options = {}) {
    const resp = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(options.headers || {}),
        },
    });

    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`GitHub API ${resp.status}: ${body}`);
    }

    return resp.status === 204 ? null : resp.json();
}

async function main() {
    if (!token) throw new Error("Missing GITHUB_TOKEN");
    if (!owner || !repo) throw new Error("Missing GITHUB_OWNER or GITHUB_REPO");

    await sodium.ready;

    const envText = fs.readFileSync(envFile, "utf8");
    const vars = parseEnv(envText);

    const keyInfo = await ghRequest(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`);
    const keyBytes = sodium.from_base64(keyInfo.key, sodium.base64_variants.ORIGINAL);

    let uploaded = 0;
    for (const [name, value] of Object.entries(vars)) {
        if (name === "HEADLESS") continue;

        const messageBytes = sodium.from_string(value);
        const cipher = sodium.crypto_box_seal(messageBytes, keyBytes);
        const encrypted_value = sodium.to_base64(cipher, sodium.base64_variants.ORIGINAL);

        await ghRequest(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/${name}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encrypted_value, key_id: keyInfo.key_id }),
        });

        console.log(`Uploaded: ${name}`);
        uploaded++;
    }

    console.log(`\n${uploaded} secret(s) uploaded to https://github.com/${owner}/${repo}`);
}

main().catch((err) => {
    console.error(err.message || String(err));
    process.exit(1);
});
'@

        $tmpJs = Join-Path $env:TEMP "push-secrets-github.js"
        Set-Content -Path $tmpJs -Value $nodeScript -Encoding UTF8

        node $tmpJs
}
finally {
        Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
        Remove-Item Env:GITHUB_OWNER -ErrorAction SilentlyContinue
        Remove-Item Env:GITHUB_REPO -ErrorAction SilentlyContinue
        Remove-Item Env:ENV_FILE_PATH -ErrorAction SilentlyContinue
        Pop-Location
}
