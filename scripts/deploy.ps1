# ==============================================
# RAYA BACKEND - Script de Déploiement PowerShell
# ==============================================
# Usage: .\deploy.ps1 [-Environment <env>] [-Action <action>]

param(
    [ValidateSet("dev", "staging", "production")]
    [string]$Environment = "dev",
    
    [ValidateSet("start", "stop", "restart", "logs", "status", "backup", "update", "build", "shell", "clean", "help")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"

# Configuration
$ProjectName = "raya"
$ComposeFile = "docker-compose.yml"

# Couleurs
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Log($message, $color = "Cyan") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] " -ForegroundColor DarkGray -NoNewline
    Write-Host $message -ForegroundColor $color
}

function Show-Help {
    Write-Host @"
==============================================
RAYA BACKEND - Script de Déploiement
==============================================

Usage: .\deploy.ps1 [-Environment <env>] [-Action <action>]

Environments:
  dev         Environnement de développement (avec Redis Commander)
  staging     Environnement de staging
  production  Environnement de production

Actions:
  start       Démarrer les conteneurs
  stop        Arrêter les conteneurs
  restart     Redémarrer les conteneurs
  logs        Afficher les logs
  status      Afficher le statut
  backup      Créer une sauvegarde
  update      Mettre à jour et redéployer
  build       Construire l'image
  shell       Ouvrir un shell dans le conteneur API
  clean       Nettoyer les images et volumes inutilisés
  help        Afficher cette aide

Exemples:
  .\deploy.ps1 -Environment dev -Action start
  .\deploy.ps1 -Environment production -Action update
  .\deploy.ps1 -Action logs
"@ -ForegroundColor White
}

# Charger les variables d'environnement
function Load-EnvFile {
    $envFile = ".env.$Environment"
    if (-not (Test-Path $envFile)) {
        $envFile = ".env"
    }
    
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            }
        }
        Log "Variables d'environnement chargées depuis $envFile" "Green"
    }
}

# Vérifier Docker
function Test-Docker {
    try {
        docker --version | Out-Null
        docker compose version | Out-Null
    } catch {
        Write-Host "Docker ou Docker Compose n'est pas installé" -ForegroundColor Red
        exit 1
    }
}

# Commande Docker Compose
function Invoke-DockerCompose {
    param([Parameter(ValueFromRemainingArguments=$true)]$Args)
    & docker compose -p $ProjectName @Args
}

# Actions
function Start-Containers {
    Log "Démarrage des conteneurs ($Environment)..." "Green"
    
    if ($Environment -eq "dev") {
        Invoke-DockerCompose --profile dev up -d
    } else {
        Invoke-DockerCompose up -d
    }
    
    Write-Host "`n✓ Conteneurs démarrés" -ForegroundColor Green
    Get-Status
}

function Stop-Containers {
    Log "Arrêt des conteneurs..." "Yellow"
    Invoke-DockerCompose down
    Write-Host "`n✓ Conteneurs arrêtés" -ForegroundColor Green
}

function Restart-Containers {
    Log "Redémarrage des conteneurs..." "Yellow"
    Stop-Containers
    Start-Containers
}

function Get-Logs {
    Log "Affichage des logs..." "Cyan"
    Invoke-DockerCompose logs -f --tail=100
}

function Get-Status {
    Log "Statut des conteneurs:" "Cyan"
    Invoke-DockerCompose ps
    Write-Host ""
    
    # Vérifier l'API
    $apiPort = if ($env:API_PORT) { $env:API_PORT } else { "3000" }
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$apiPort/api/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ API: OK (http://localhost:$apiPort)" -ForegroundColor Green
    } catch {
        Write-Host "✗ API: Non accessible" -ForegroundColor Red
    }

    # Vérifier Redis
    try {
        $redisCheck = docker exec raya-redis redis-cli ping 2>&1
        if ($redisCheck -eq "PONG") {
            Write-Host "✓ Redis: OK" -ForegroundColor Green
        } else {
            Write-Host "✗ Redis: Non accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Redis: Non accessible" -ForegroundColor Red
    }

}

function New-Backup {
    $backupDir = "./backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "raya_backup_$timestamp"
    
    Log "Création de la sauvegarde..." "Cyan"
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    # Sauvegarder les données
    docker run --rm `
        -v raya-data:/data `
        -v "${PWD}/backups:/backup" `
        alpine tar czf "/backup/${backupName}_data.tar.gz" -C /data .
    
    Write-Host "`n✓ Sauvegarde créée: $backupDir/$backupName" -ForegroundColor Green
}

function Update-Deployment {
    Log "Mise à jour du déploiement..." "Cyan"
    
    # Sauvegarder
    New-Backup
    
    # Git pull si repo
    if (Test-Path ".git") {
        Log "Récupération du code..."
        git pull origin main
    }
    
    # Reconstruire
    Log "Construction de l'image..."
    Invoke-DockerCompose build --no-cache
    
    # Redémarrer
    Log "Redémarrage des services..."
    Invoke-DockerCompose up -d
    
    Write-Host "`n✓ Mise à jour terminée" -ForegroundColor Green
    Get-Status
}

function Build-Image {
    Log "Construction de l'image Docker..." "Cyan"
    Invoke-DockerCompose build
    Write-Host "`n✓ Image construite" -ForegroundColor Green
}

function Enter-Shell {
    Log "Ouverture d'un shell dans le conteneur API..." "Cyan"
    docker exec -it raya-api sh
}


function Clear-Docker {
    Log "Nettoyage des ressources Docker inutilisées..." "Yellow"
    Invoke-DockerCompose down
    docker image prune -f
    $confirm = Read-Host "Voulez-vous aussi nettoyer les volumes orphelins? (y/N)"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        docker volume prune -f
    }
    Write-Host "`n✓ Nettoyage terminé" -ForegroundColor Green
}


# Point d'entrée principal
Test-Docker
Load-EnvFile

switch ($Action) {
    "start"   { Start-Containers }
    "stop"    { Stop-Containers }
    "restart" { Restart-Containers }
    "logs"    { Get-Logs }
    "status"  { Get-Status }
    "backup"  { New-Backup }
    "update"  { Update-Deployment }
    "build"   { Build-Image }
    "shell"   { Enter-Shell }
    "clean"   { Clear-Docker }
    "help"    { Show-Help }
    default   {
        Write-Host ("Action inconnue: {0}" -f $Action) -ForegroundColor Red
        Show-Help
    }
}
