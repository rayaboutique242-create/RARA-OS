#!/bin/bash
# ==============================================
# RAYA BACKEND - Script de Déploiement
# ==============================================
# Usage: ./deploy.sh [environment] [action]
# Environments: dev, staging, production
# Actions: start, stop, restart, logs, status, backup, update

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
ENVIRONMENT=${1:-dev}
ACTION=${2:-start}
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="raya"

# Charger les variables d'environnement
if [ -f ".env.${ENVIRONMENT}" ]; then
    export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Variables d'environnement chargées depuis .env.${ENVIRONMENT}${NC}"
elif [ -f ".env" ]; then
    export $(cat ".env" | grep -v '^#' | xargs)
    echo -e "${YELLOW}⚠ Utilisation de .env par défaut${NC}"
fi

# Fonction d'aide
show_help() {
    echo -e "${BLUE}==============================================
RAYA BACKEND - Script de Déploiement
==============================================${NC}

Usage: $0 [environment] [action]

${YELLOW}Environments:${NC}
  dev         Environnement de développement (avec Redis Commander)
  staging     Environnement de staging
  production  Environnement de production

${YELLOW}Actions:${NC}
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

${YELLOW}Exemples:${NC}
  $0 dev start
  $0 production update
  $0 staging logs
"
}

# Fonction de log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Vérifier Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker n'est pas installé${NC}"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}✗ Docker Compose n'est pas installé${NC}"
        exit 1
    fi
}

# Commande Docker Compose
docker_compose() {
    if docker compose version &> /dev/null; then
        docker compose -p "$PROJECT_NAME" "$@"
    else
        docker-compose -p "$PROJECT_NAME" "$@"
    fi
}

# Actions
start() {
    log "${GREEN}Démarrage des conteneurs ($ENVIRONMENT)...${NC}"
    
    if [ "$ENVIRONMENT" == "dev" ]; then
        docker_compose --profile dev up -d
    else
        docker_compose up -d
    fi
    
    echo -e "${GREEN}✓ Conteneurs démarrés${NC}"
    status
}

stop() {
    log "${YELLOW}Arrêt des conteneurs...${NC}"
    docker_compose down
    echo -e "${GREEN}✓ Conteneurs arrêtés${NC}"
}

restart() {
    log "${YELLOW}Redémarrage des conteneurs...${NC}"
    stop
    start
}

logs() {
    log "${BLUE}Affichage des logs...${NC}"
    docker_compose logs -f --tail=100
}

status() {
    log "${BLUE}Statut des conteneurs:${NC}"
    docker_compose ps
    echo ""
    
    # Vérifier la santé de l'API
    if curl -s http://localhost:${API_PORT:-3000}/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API: OK (http://localhost:${API_PORT:-3000})${NC}"
    else
        echo -e "${RED}✗ API: Non accessible${NC}"
    fi
    
    # Vérifier Redis
    if docker_compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis: OK${NC}"
    else
        echo -e "${RED}✗ Redis: Non accessible${NC}"
    fi
}

backup() {
    BACKUP_DIR="./backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_NAME="raya_backup_${TIMESTAMP}"
    
    log "${BLUE}Création de la sauvegarde...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Sauvegarder les données SQLite
    docker_compose exec -T api cp /app/data/raya.sqlite /app/backups/${BACKUP_NAME}.sqlite 2>/dev/null || true
    
    # Sauvegarder les volumes
    docker run --rm \
        -v raya-data:/data \
        -v $(pwd)/backups:/backup \
        alpine tar czf /backup/${BACKUP_NAME}_data.tar.gz -C /data .
    
    echo -e "${GREEN}✓ Sauvegarde créée: ${BACKUP_DIR}/${BACKUP_NAME}${NC}"
}

update() {
    log "${BLUE}Mise à jour du déploiement...${NC}"
    
    # Sauvegarder avant la mise à jour
    backup
    
    # Récupérer les dernières modifications
    if [ -d ".git" ]; then
        log "Récupération du code..."
        git pull origin main
    fi
    
    # Reconstruire l'image
    log "Construction de l'image..."
    docker_compose build --no-cache
    
    # Redémarrer avec la nouvelle image
    log "Redémarrage des services..."
    docker_compose up -d
    
    echo -e "${GREEN}✓ Mise à jour terminée${NC}"
    status
}

build() {
    log "${BLUE}Construction de l'image Docker...${NC}"
    docker_compose build
    echo -e "${GREEN}✓ Image construite${NC}"
}

shell() {
    log "${BLUE}Ouverture d'un shell dans le conteneur API...${NC}"
    docker_compose exec api sh
}

clean() {
    log "${YELLOW}Nettoyage des ressources Docker inutilisées...${NC}"
    
    # Arrêter les conteneurs
    docker_compose down
    
    # Nettoyer les images non utilisées
    docker image prune -f
    
    # Nettoyer les volumes non utilisés (attention!)
    read -p "Voulez-vous aussi nettoyer les volumes orphelins? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    echo -e "${GREEN}✓ Nettoyage terminé${NC}"
}

# Point d'entrée principal
check_docker

case "$ACTION" in
    start)    start ;;
    stop)     stop ;;
    restart)  restart ;;
    logs)     logs ;;
    status)   status ;;
    backup)   backup ;;
    update)   update ;;
    build)    build ;;
    shell)    shell ;;
    clean)    clean ;;
    help|-h|--help) show_help ;;
    *)
        echo -e "${RED}Action inconnue: $ACTION${NC}"
        show_help
        exit 1
        ;;
esac
