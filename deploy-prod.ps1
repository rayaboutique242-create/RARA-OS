#!/usr/bin/env powershell
<#
.SYNOPSIS
    RAYA Production Deployment Orchestrator
    
.DESCRIPTION
    Comprehensive deployment script for RAYA SaaS backend to production
    
.PARAMETER Action
    Deploy action: 'validate', 'migrate', 'deploy', 'health', 'logs', 'rollback', 'backup'
    
.PARAMETER Environment
    Target environment: 'production' or 'staging'
    
.PARAMETER Version
    Docker image version to deploy (default: latest)
    
.EXAMPLE
    .\deploy-prod.ps1 -Action validate -Environment production
    .\deploy-prod.ps1 -Action deploy -Environment production -Version v1.2.3
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('validate', 'migrate', 'deploy', 'health', 'logs', 'rollback', 'backup')]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('production', 'staging')]
    [string]$Environment = 'production',
    
    [Parameter(Mandatory=$false)]
    [string]$Version = 'latest'
)

# Configuration
$ErrorActionPreference = 'Stop'
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$composeFile = Join-Path $projectRoot 'docker-compose.prod.yml'
$envFile = Join-Path $projectRoot ".env.$Environment"
$backupDir = Join-Path $projectRoot 'backups'
$logsDir = Join-Path $projectRoot 'logs'

# Colors
$colors = @{
    Success = 'Green'
    Error = 'Red'
    Warning = 'Yellow'
    Info = 'Cyan'
}

function Write-Log {
    param([string]$Message, [string]$Level = 'Info')
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $colors[$Level]
}

function Test-Prerequisites {
    Write-Log 'Checking prerequisites...' 'Info'
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Log "Docker: $dockerVersion" 'Success'
    } catch {
        Write-Log 'Docker not found or not running' 'Error'
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker compose --version
        Write-Log "Docker Compose: $composeVersion" 'Success'
    } catch {
        Write-Log 'Docker Compose not found' 'Error'
        exit 1
    }
    
    # Check env file
    if (-not (Test-Path $envFile)) {
        Write-Log "Environment file not found: $envFile" 'Error'
        exit 1
    }
    
    # Check compose file
    if (-not (Test-Path $composeFile)) {
        Write-Log "Docker Compose file not found: $composeFile" 'Error'
        exit 1
    }
    
    Write-Log 'Prerequisites check passed' 'Success'
}

function Create-Backup {
    Write-Log 'Creating backup before deployment...' 'Info'
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    $backupFile = Join-Path $backupDir "backup_${timestamp}.tar.gz"
    
    try {
        # Backup database
        Write-Log 'Backing up PostgreSQL database...' 'Info'
        docker compose -f $composeFile exec -T postgres pg_dump -U raya_user raya_prod | gzip > "$backupDir\db_${timestamp}.sql.gz"
        
        # Backup Redis
        Write-Log 'Backing up Redis data...' 'Info'
        docker compose -f $composeFile exec -T redis redis-cli BGSAVE
        Start-Sleep -Seconds 2
        docker cp raya_redis_prod:/data/dump.rdb "$backupDir\redis_${timestamp}.rdb"
        
        Write-Log "Backup completed: $backupFile" 'Success'
    } catch {
        Write-Log "Backup failed: $_" 'Error'
        exit 1
    }
}

function Validate-Deployment {
    Write-Log 'Validating deployment configuration...' 'Info'
    
    # Check env vars
    Write-Log 'Checking environment variables...' 'Info'
    $requiredVars = @(
        'DATABASE_URL',
        'JWT_SECRET',
        'SMTP_HOST',
        'STRIPE_SECRET_KEY',
        'AWS_ACCESS_KEY_ID'
    )
    
    $envContent = Get-Content $envFile
    foreach ($var in $requiredVars) {
        if (-not ($envContent -match "^$var=")) {
            Write-Log "Missing required variable: $var" 'Warning'
        }
    }
    
    # Validate YAML syntax
    Write-Log 'Validating Docker Compose syntax...' 'Info'
    docker compose -f $composeFile config > $null
    
    Write-Log 'Validation completed successfully' 'Success'
}

function Run-Migrations {
    Write-Log 'Running database migrations...' 'Info'
    
    try {
        # Start services if not running
        docker compose -f $composeFile up -d
        
        # Wait for database
        Write-Log 'Waiting for database to be ready...' 'Info'
        Start-Sleep -Seconds 10
        
        # Run migrations
        docker compose -f $composeFile exec -T api npm run migration:run
        
        # Verify migrations
        $tableCount = docker compose -f $composeFile exec -T postgres psql -U raya_user -d raya_prod -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
        Write-Log "Database ready with $tableCount tables" 'Success'
    } catch {
        Write-Log "Migration failed: $_" 'Error'
        exit 1
    }
}

function Deploy {
    Write-Log "Deploying RAYA to $Environment..." 'Info'
    
    try {
        # Build images
        Write-Log 'Building Docker images...' 'Info'
        docker compose -f $composeFile build
        
        # Create backup before deployment
        Create-Backup
        
        # Stop existing containers
        Write-Log 'Stopping existing services...' 'Info'
        docker compose -f $composeFile down --remove-orphans
        
        # Start new containers
        Write-Log 'Starting services...' 'Info'
        docker compose -f $composeFile up -d
        
        # Wait for services
        Write-Log 'Waiting for services to be healthy...' 'Info'
        Start-Sleep -Seconds 15
        
        # Run migrations
        Run-Migrations
        
        # Verify deployment
        Health-Check
        
        Write-Log 'Deployment completed successfully' 'Success'
    } catch {
        Write-Log "Deployment failed: $_" 'Error'
        Write-Log 'Initiating rollback...' 'Warning'
        Rollback
        exit 1
    }
}

function Health-Check {
    Write-Log 'Running health checks...' 'Info'
    
    $maxAttempts = 5
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-RestMethod -Uri 'http://localhost:3000/health' -TimeoutSec 5 -ErrorAction Stop
            
            if ($response.status -eq 'ok') {
                Write-Log 'API health check passed' 'Success'
                
                # Check database
                $dbHealth = docker compose -f $composeFile exec -T postgres psql -U raya_user -d raya_prod -t -c "SELECT 1;"
                if ($dbHealth -eq 1) {
                    Write-Log 'Database health check passed' 'Success'
                    return $true
                }
            }
        } catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Log "Health check attempt $attempt/$maxAttempts failed, retrying..." 'Warning'
                Start-Sleep -Seconds 5
            }
        }
    }
    
    Write-Log 'Health checks failed after maximum attempts' 'Error'
    return $false
}

function Show-Logs {
    Write-Log 'Displaying service logs...' 'Info'
    docker compose -f $composeFile logs -f --tail=100
}

function Rollback {
    Write-Log "Rolling back deployment in $Environment..." 'Warning'
    
    try {
        # Find latest backup
        $latestBackup = Get-ChildItem -Path $backupDir -Filter 'db_*.sql.gz' | Sort-Object CreationTime -Descending | Select-Object -First 1
        
        if (-not $latestBackup) {
            Write-Log 'No backup found for rollback' 'Error'
            return
        }
        
        Write-Log "Restoring from backup: $latestBackup" 'Info'
        
        # Stop API
        docker compose -f $composeFile stop api
        
        # Restore database
        gunzip -c $latestBackup.FullName | docker compose -f $composeFile exec -T postgres psql -U raya_user raya_prod
        
        # Start API
        docker compose -f $composeFile start api
        
        Write-Log 'Rollback completed' 'Success'
    } catch {
        Write-Log "Rollback failed: $_" 'Error'
        exit 1
    }
}

function Create-Backup-Only {
    Write-Log 'Creating backup without deployment...' 'Info'
    Create-Backup
}

# Main execution
try {
    Test-Prerequisites
    
    switch ($Action) {
        'validate' { Validate-Deployment }
        'migrate' { Run-Migrations }
        'deploy' { Deploy }
        'health' { Health-Check }
        'logs' { Show-Logs }
        'rollback' { Rollback }
        'backup' { Create-Backup-Only }
    }
    
    Write-Log "Action '$Action' completed successfully" 'Success'
} catch {
    Write-Log "Fatal error: $_" 'Error'
    exit 1
}
