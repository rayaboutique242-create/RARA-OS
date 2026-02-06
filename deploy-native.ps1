#!/usr/bin/env powershell
<#
.SYNOPSIS
    RAYA Native Deployment (No Docker)
    
.DESCRIPTION
    Deploy RAYA backend without Docker using Node.js native
    
.PARAMETER Action
    'build', 'start', 'stop', 'restart', 'dev', 'test'
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('build', 'start', 'stop', 'restart', 'dev', 'test')]
    [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'
$backendPath = 'c:\GESTION BOUTIQUE2\raya-backend'
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

function Write-Status {
    param([string]$Message, [string]$Type = 'Info')
    $colors = @{ Success = 'Green'; Error = 'Red'; Warning = 'Yellow'; Info = 'Cyan' }
    Write-Host "[$timestamp] [$Type] $Message" -ForegroundColor $colors[$Type]
}

function Test-Prerequisites {
    Write-Status 'Checking prerequisites...' 'Info'
    
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Status "Node.js: $nodeVersion" 'Success'
        Write-Status "npm: $npmVersion" 'Success'
    } catch {
        Write-Status 'Node.js or npm not found' 'Error'
        exit 1
    }
}

function Install-Dependencies {
    Write-Status 'Installing dependencies...' 'Info'
    Set-Location $backendPath
    
    if (Test-Path 'node_modules') {
        Write-Status 'Dependencies already installed' 'Success'
        return
    }
    
    & npm install 2>&1 | Write-Host
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status 'npm install failed' 'Error'
        exit 1
    }
    
    Write-Status 'Dependencies installed' 'Success'
}

function Build-Application {
    Write-Status 'Building application...' 'Info'
    Set-Location $backendPath
    
    & npm run build 2>&1 | Write-Host
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status 'Build failed' 'Error'
        exit 1
    }
    
    Write-Status 'Build completed' 'Success'
}

function Start-Application {
    Write-Status 'Starting application...' 'Info'
    Set-Location $backendPath
    
    # Check for PM2
    try {
        $pm2Check = & npm list pm2 2>&1
        if ($pm2Check -notmatch 'not installed') {
            Write-Status 'Starting with PM2...' 'Info'
            & npx pm2 start dist/main.js --name raya-api --update-env
            & npx pm2 logs raya-api
            return
        }
    } catch { }
    
    Write-Status 'Starting with npm run start:prod...' 'Info'
    & npm run start:prod
}

function Stop-Application {
    Write-Status 'Stopping application...' 'Info'
    
    try {
        & npx pm2 stop raya-api 2>&1 | Out-Null
        Write-Status 'Application stopped' 'Success'
    } catch {
        Write-Status 'PM2 not running or app already stopped' 'Warning'
    }
}

function Dev-Mode {
    Write-Status 'Starting development mode...' 'Info'
    Set-Location $backendPath
    
    & npm run start:dev 2>&1 | Write-Host
}

function Run-Tests {
    Write-Status 'Running tests...' 'Info'
    Set-Location $backendPath
    
    # Run API test suite
    Write-Status 'Waiting 10s for API to be ready...' 'Info'
    Start-Sleep -Seconds 10
    
    Write-Status 'Executing Postman test suite...' 'Info'
    & powershell -ExecutionPolicy Bypass -File '..\postman_collections\run_api_tests.ps1'
}

# Main execution
try {
    Test-Prerequisites
    
    switch ($Action) {
        'build' {
            Install-Dependencies
            Build-Application
        }
        'start' {
            Install-Dependencies
            Build-Application
            Start-Application
        }
        'stop' { Stop-Application }
        'restart' {
            Stop-Application
            Start-Sleep -Seconds 3
            Start-Application
        }
        'dev' {
            Install-Dependencies
            Dev-Mode
        }
        'test' {
            Run-Tests
        }
    }
    
    Write-Status "Action '$Action' completed" 'Success'
} catch {
    Write-Status "Error: $_" 'Error'
    exit 1
}
