#requires -Version 5.1
<#
.SYNOPSIS
    Deploys SDP Tools (builds the app and (re)starts it under pm2) on Windows.

.DESCRIPTION
    Pulls the latest code (unless -SkipPull is set), installs dependencies,
    builds the client and server, then starts or restarts the app under pm2
    using ecosystem.config.js.

.PARAMETER Branch
    Git branch to deploy from. Defaults to the currently checked-out branch.

.PARAMETER SkipPull
    Skip `git pull` — deploy whatever is currently on disk.

.PARAMETER SkipInstall
    Skip `npm install` — reuse the existing node_modules.

.PARAMETER Port
    Port for the app to listen on. Defaults to 4000.

.PARAMETER OpenBrowser
    Open the app in the default browser once the deployment is confirmed healthy.

.EXAMPLE
    .\deploy.ps1

.EXAMPLE
    .\deploy.ps1 -Branch main -Port 4100 -OpenBrowser
#>

[CmdletBinding()]
param(
    [string]$Branch,
    [switch]$SkipPull,
    [switch]$SkipInstall,
    [ValidateRange(1, 65535)]
    [int]$Port = 4000,
    [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

function Write-Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Assert-CommandExists($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "'$name' was not found on PATH. $hint"
    }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $repoRoot
try {
    Assert-CommandExists 'node' 'Install Node.js from https://nodejs.org (LTS) and re-run this script.'
    Assert-CommandExists 'npm'  'npm ships with Node.js — reinstall Node.js if it is missing.'
    Assert-CommandExists 'git'  'Install Git from https://git-scm.com and re-run this script.'

    Write-Step "Node $(node -v) / npm v$(npm -v)"

    if (-not $SkipPull) {
        $dirty = git status --porcelain
        if ($dirty) {
            throw "Working tree has uncommitted changes. Commit, stash, or discard them before deploying:`n$dirty"
        }

        if ($Branch) {
            Write-Step "Checking out '$Branch' and pulling latest changes"
            git checkout $Branch
            if ($LASTEXITCODE -ne 0) { throw "git checkout '$Branch' failed with exit code $LASTEXITCODE" }
        } else {
            $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
            if ($Branch -eq 'HEAD') {
                throw "Currently in a detached HEAD state (e.g. a pinned tag/commit is checked out). Pass -Branch <name> explicitly, or -SkipPull to deploy as-is."
            }
            Write-Step "Pulling latest changes for current branch '$Branch'"
        }

        $upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $upstream) {
            Write-Step "Pulling from configured upstream '$upstream'"
            git pull --ff-only
        } else {
            Write-Step "No upstream configured for '$Branch' — pulling from origin/$Branch"
            git pull --ff-only origin $Branch
        }
        if ($LASTEXITCODE -ne 0) { throw "git pull failed with exit code $LASTEXITCODE — deployment aborted to avoid building a stale checkout." }
    } else {
        Write-Step "Skipping git pull (-SkipPull)"
    }

    if (-not $SkipInstall) {
        Write-Step "Installing dependencies (npm install --include=dev)"
        # --include=dev guarantees devDependencies (typescript, vite, etc.) are installed even if
        # NODE_ENV=production is set in the calling shell, which npm would otherwise treat as a
        # signal to omit them — and the build below needs them.
        #
        # npm install is retried once because npm's CLI has a known, purely client-side race
        # ("Exit handler never called!", npm/cli#4028) that surfaces intermittently, especially on
        # Windows — a plain re-run typically succeeds without any change on our end.
        $maxInstallAttempts = 2
        for ($attempt = 1; $attempt -le $maxInstallAttempts; $attempt++) {
            npm install --include=dev
            if ($LASTEXITCODE -eq 0) { break }
            if ($attempt -lt $maxInstallAttempts) {
                Write-Host "npm install failed (exit $LASTEXITCODE) — retrying once, this can be a transient npm client issue..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            }
        }
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE after $maxInstallAttempts attempt(s). If the error is 'Exit handler never called!', that is a known npm client bug (https://github.com/npm/cli/issues/4028), not an issue with this project — try 'npm cache clean --force', updating npm ('npm install -g npm@latest'), or temporarily excluding the npm cache/repo folder from antivirus scanning, then re-run this script."
        }
    } else {
        Write-Step "Skipping npm install (-SkipInstall)"
    }

    Write-Step "Building client and server (npm run build)"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }

    Write-Step "Starting/restarting sdp-tools under pm2 (port $Port)"
    $env:PORT = "$Port"

    # pm2 can print daemon-startup banner lines (e.g. spawning the daemon on first run) ahead of
    # the JSON payload, so pick out the line that actually looks like the JSON array rather than
    # piping everything straight into ConvertFrom-Json.
    $jlistOutput = npx pm2 jlist --silent 2>$null
    $jlistJson = $jlistOutput | Where-Object { $_.TrimStart().StartsWith('[') } | Select-Object -Last 1
    $existing = $null
    if ($jlistJson) {
        try {
            $existing = $jlistJson | ConvertFrom-Json | Where-Object { $_.name -eq 'sdp-tools' }
        } catch {
            $existing = $null
        }
    }
    if ($existing) {
        npx pm2 restart ecosystem.config.js --update-env
    } else {
        npx pm2 start ecosystem.config.js
    }
    if ($LASTEXITCODE -ne 0) { throw "pm2 start/restart failed with exit code $LASTEXITCODE" }

    Write-Step "Waiting for http://localhost:$Port/api/health to respond"
    $healthUrl = "http://localhost:$Port/api/health"
    $healthy = $false
    for ($i = 1; $i -le 15; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # Not up yet — keep retrying until the timeout below.
        }
        Start-Sleep -Seconds 1
    }

    npx pm2 status sdp-tools

    if (-not $healthy) {
        throw "Deployment finished starting pm2, but $healthUrl did not respond with 200 within 15 seconds. Check 'npx pm2 logs sdp-tools' for errors — the app may have crashed or is stuck restarting. The pm2 process list was NOT saved, so a reboot will restore the previous working deployment instead of this failed one."
    }

    npx pm2 save
    if ($LASTEXITCODE -ne 0) { throw "pm2 save failed with exit code $LASTEXITCODE — the app is healthy but the process list was not updated, so a reboot may not restore this deployment." }

    $appUrl = "http://localhost:$Port"
    Write-Step "Deployed successfully."
    # Printed as a bare URL on its own line (no surrounding text/color) so terminals that
    # auto-linkify plain URLs (Windows Terminal, VS Code, etc.) make it clickable.
    Write-Host $appUrl

    if ($OpenBrowser) {
        Start-Process $appUrl
    }
}
finally {
    Pop-Location
}
