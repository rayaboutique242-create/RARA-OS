# Guide d'Authentification - Raya Backend

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [JWT & Refresh Token Rotation](#jwt--refresh-token-rotation)
3. [OAuth2 (Google & GitHub)](#oauth2-google--github)
4. [Gestion des Sessions](#gestion-des-sessions)
5. [Réinitialisation de Mot de Passe](#réinitialisation-de-mot-de-passe)
6. [Changement de Mot de Passe](#changement-de-mot-de-passe)
7. [Verrouillage de Compte](#verrouillage-de-compte)
8. [Variables d'Environnement](#variables-denvironnement)
9. [Endpoints API](#endpoints-api)
10. [Sécurité](#sécurité)
11. [Architecture](#architecture)

---

## Vue d'ensemble

Le système d'authentification de Raya implémente les mécanismes suivants :

- **JWT** avec rotation automatique des refresh tokens
- **OAuth2** via Google et GitHub (optionnel, activé par config)
- **Sessions multi-appareils** avec suivi en base de données
- **Réinitialisation de mot de passe** par email avec tokens sécurisés
- **Verrouillage de compte** après tentatives échouées
- **OTP** (SMS/Email) — module existant

---

## JWT & Refresh Token Rotation

### Principe

```
                     ┌─────────────┐
  Login ───────────► │ Access Token│  (courte durée : 1h par défaut)
                     │ + Refresh   │  (longue durée : 7j par défaut)
                     └─────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                                    ▼
   Access expiré                       Refresh valide
         │                                    │
         ▼                                    ▼
   POST /auth/refresh ───► Nouveau Access + NOUVEAU Refresh
                           (l'ancien refresh est invalidé)
```

### Rotation des Refresh Tokens

À chaque appel `POST /auth/refresh` :

1. Le refresh token actuel est vérifié (signature JWT + hash en base)
2. Un **nouveau** couple (access_token + refresh_token) est généré
3. Le hash du nouveau refresh token remplace l'ancien en base
4. L'ancien refresh token est immédiatement invalidé

**Détection de réutilisation** : Si un refresh token déjà utilisé est présenté, **toutes les sessions** de l'utilisateur sont révoquées (protection contre le vol de token).

### Utilisation

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password123"}'

# Réponse
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "user": { "id": 1, "email": "user@example.com", "role": "VENDEUR" }
}

# Rafraîchir le token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbG..."}'

# Réponse (nouveaux tokens)
{
  "access_token": "eyJhbG...(nouveau)",
  "refresh_token": "eyJhbG...(nouveau)"
}
```

---

## OAuth2 (Google & GitHub)

### Configuration

Les providers OAuth sont **optionnels**. S'ils ne sont pas configurés, les endpoints retournent `501 Not Implemented`.

#### Google

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer l'API Google+ ou People API
3. Créer des identifiants OAuth 2.0
4. Configurer les URIs de redirection autorisées : `http://localhost:3000/api/auth/google/callback`

```env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

#### GitHub

1. Aller dans [GitHub Developer Settings](https://github.com/settings/developers)
2. Créer une nouvelle OAuth App
3. Authorization callback URL : `http://localhost:3000/api/auth/github/callback`

```env
GITHUB_CLIENT_ID=Iv1.xxxxxx
GITHUB_CLIENT_SECRET=xxxxxx
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
```

### Flux OAuth

```
Utilisateur ──► GET /api/auth/google ──► Redirection Google ──► Consentement
     ▲                                                              │
     │                                                              ▼
     └──── Frontend reçoit tokens ◄──── GET /api/auth/google/callback
            (via query params)          (crée/lie le compte + session)
```

Le callback redirige vers `FRONTEND_URL/auth/callback?access_token=...&refresh_token=...`

### Comportement

| Scénario | Action |
|----------|--------|
| Nouvel utilisateur OAuth | Création automatique du compte (sans mot de passe) |
| Utilisateur existant (même email) | Liaison du provider OAuth au compte existant |
| Utilisateur OAuth tente de se connecter par mot de passe | Erreur : "Compte créé via OAuth, utilisez le provider" |

---

## Gestion des Sessions

Chaque connexion (login, OAuth, register) crée une **session** en base, liée au couple (utilisateur + appareil).

### Limite de sessions

Maximum **5 sessions actives** par utilisateur. Si dépassé, la session la plus ancienne est automatiquement révoquée.

### Endpoints

```bash
# Lister mes sessions actives
curl -X GET http://localhost:3000/api/auth/sessions \
  -H "Authorization: Bearer <access_token>"

# Réponse
{
  "sessions": [
    {
      "id": "uuid-1",
      "deviceInfo": "Chrome on Windows",
      "ipAddress": "192.168.1.1",
      "lastActivity": "2025-01-15T10:30:00Z",
      "isCurrent": true
    },
    {
      "id": "uuid-2",
      "deviceInfo": "Safari on iPhone",
      "ipAddress": "10.0.0.5",
      "lastActivity": "2025-01-14T18:00:00Z",
      "isCurrent": false
    }
  ]
}

# Révoquer une session spécifique
curl -X DELETE http://localhost:3000/api/auth/sessions/uuid-2 \
  -H "Authorization: Bearer <access_token>"

# Révoquer toutes les autres sessions (garder la courante)
curl -X POST http://localhost:3000/api/auth/sessions/revoke-others \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"current_refresh_token": "eyJhbG..."}'

# Déconnexion totale (toutes les sessions)
curl -X POST http://localhost:3000/api/auth/logout-all \
  -H "Authorization: Bearer <access_token>"
```

### Informations de session

Chaque session enregistre :
- **Device info** : type de navigateur/appareil (extrait du User-Agent)
- **Adresse IP** : IP du client
- **User-Agent** : header complet
- **Dernière activité** : mise à jour lors du refresh token
- **Date d'expiration** : alignée sur l'expiration du refresh token

---

## Réinitialisation de Mot de Passe

### Flux complet

```
1. POST /api/auth/forgot-password  ──► Email envoyé avec lien + token
                                        (token valide 1 heure)

2. L'utilisateur clique sur le lien dans l'email
   → Redirigé vers FRONTEND_URL/reset-password?token=xxxx

3. POST /api/auth/reset-password   ──► Mot de passe mis à jour
   { token, newPassword }               + Toutes les sessions révoquées
```

### Sécurité

- Le token est un random de 32 octets (hex)
- Seul le **hash SHA-256** est stocké en base
- Expiration : 1 heure
- Le token est usage unique (effacé après utilisation)
- **Toutes les sessions sont révoquées** après un reset (force la reconnexion)
- Réponse identique que l'email existe ou non (anti-énumération)

### Exemple

```bash
# Demander un reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Réponse (toujours la même, que l'email existe ou non)
{ "message": "Si cet email existe, un lien de réinitialisation a été envoyé" }

# Réinitialiser le mot de passe
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123...", "newPassword": "NewPass123"}'
```

### Configuration Email

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=app-specific-password
SMTP_FROM="Raya App <noreply@example.com>"
FRONTEND_URL=http://localhost:4200
APP_NAME=Raya
```

> **Mode développement** : Si `SMTP_HOST` n'est pas configuré, les emails sont affichés dans la console du serveur avec le préfixe `[DEV]`, incluant le lien de reset complet.

---

## Changement de Mot de Passe

Pour les utilisateurs déjà connectés :

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123",
    "newPassword": "NewPass456"
  }'
```

**Validations** :
- Le mot de passe actuel doit être correct
- Le nouveau mot de passe doit être ≠ de l'ancien
- Min 8 caractères, au moins 1 majuscule et 1 chiffre

---

## Verrouillage de Compte

| Paramètre | Valeur |
|-----------|--------|
| Tentatives avant verrouillage | 5 |
| Durée de verrouillage | 15 minutes |

Après 5 tentatives de connexion échouées consécutives :
- Le compte est temporairement verrouillé
- Toute tentative de connexion retourne `423 Locked` avec le temps restant
- Le compteur se réinitialise après une connexion réussie

---

## Variables d'Environnement

### Obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `JWT_SECRET` | Clé de signature des access tokens | `super-secret-key-min-32-chars` |

### Recommandées

| Variable | Description | Défaut |
|----------|-------------|--------|
| `JWT_EXPIRES_IN` | Durée access token (secondes) | `3600` (1h) |
| `JWT_REFRESH_SECRET` | Clé de signature des refresh tokens | `JWT_SECRET + '-refresh'` |
| `JWT_REFRESH_EXPIRES_IN` | Durée refresh token (secondes) | `604800` (7j) |

### OAuth2 (Optionnelles)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google OAuth |
| `GOOGLE_CALLBACK_URL` | URL de callback Google |
| `GITHUB_CLIENT_ID` | Client ID GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Client Secret GitHub OAuth |
| `GITHUB_CALLBACK_URL` | URL de callback GitHub |

### Email (Optionnelles)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SMTP_HOST` | Serveur SMTP | *(console en dev)* |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Utilisateur SMTP | - |
| `SMTP_PASS` | Mot de passe SMTP | - |
| `SMTP_FROM` | Adresse expéditeur | `noreply@raya.app` |
| `FRONTEND_URL` | URL du frontend | `http://localhost:4200` |
| `APP_NAME` | Nom de l'application | `Raya` |

---

## Endpoints API

### Authentification de base

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Inscription |
| `POST` | `/api/auth/login` | ❌ | Connexion |
| `POST` | `/api/auth/refresh` | ❌ | Rafraîchir les tokens |
| `GET` | `/api/auth/me` | ✅ | Profil utilisateur |

### Déconnexion

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/auth/logout` | ✅ | Déconnexion (session courante) |
| `POST` | `/api/auth/logout-all` | ✅ | Déconnexion (toutes les sessions) |

### Mot de passe

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/auth/forgot-password` | ❌ | Demander un reset |
| `POST` | `/api/auth/reset-password` | ❌ | Réinitialiser le mot de passe |
| `POST` | `/api/auth/change-password` | ✅ | Changer le mot de passe |

### Sessions

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/auth/sessions` | ✅ | Lister les sessions |
| `DELETE` | `/api/auth/sessions/:id` | ✅ | Révoquer une session |
| `POST` | `/api/auth/sessions/revoke-others` | ✅ | Révoquer les autres sessions |

### OAuth2

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/auth/google` | ❌ | Redirection vers Google |
| `GET` | `/api/auth/google/callback` | ❌ | Callback Google |
| `GET` | `/api/auth/github` | ❌ | Redirection vers GitHub |
| `GET` | `/api/auth/github/callback` | ❌ | Callback GitHub |

### OTP (existant)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/auth/otp/send` | ❌ | Envoyer un code OTP |
| `POST` | `/api/auth/otp/verify` | ❌ | Vérifier un code OTP |

---

## Sécurité

### Bonnes pratiques implémentées

| Mesure | Détail |
|--------|--------|
| Refresh Token Rotation | Nouveau refresh token à chaque utilisation |
| Token Reuse Detection | Toutes les sessions révoquées si réutilisation détectée |
| Password Reset Hashing | Seul le hash SHA-256 du token est stocké |
| Account Lockout | 15min après 5 tentatives échouées |
| Anti-enumeration | Même réponse pour forgot-password que l'email existe ou non |
| Bcrypt | Mots de passe hashés avec bcrypt (salt rounds = 10) |
| Session Limit | Maximum 5 sessions actives par utilisateur |
| Forced Re-auth | Toutes les sessions révoquées après un password reset |
| OAuth Account Separation | Les comptes OAuth ne peuvent pas se connecter par mot de passe |

### Headers de sécurité

Les headers de sécurité sont gérés par Helmet (déjà configuré dans `main.ts`).

---

## Architecture

```
src/auth/
├── auth.module.ts              # Module principal (JWT, Passport, TypeORM)
├── auth.service.ts             # Logique métier (login, register, OAuth, reset...)
├── auth.controller.ts          # 16 endpoints REST
├── dto/
│   ├── login.dto.ts            # Email + password
│   ├── register.dto.ts         # Email + password + name + tenantId
│   ├── forgot-password.dto.ts  # Email
│   ├── reset-password.dto.ts   # Token + newPassword
│   └── change-password.dto.ts  # currentPassword + newPassword
├── entities/
│   └── session.entity.ts       # Table sessions (multi-appareils)
├── guards/
│   ├── jwt-auth.guard.ts       # Guard JWT standard
│   ├── roles.guard.ts          # Guard basé sur les rôles
│   ├── google-auth.guard.ts    # Guard OAuth Google (vérifie la config)
│   └── github-auth.guard.ts    # Guard OAuth GitHub (vérifie la config)
├── strategies/
│   ├── jwt.strategy.ts         # Stratégie Passport JWT
│   ├── local.strategy.ts       # Stratégie Passport Local
│   ├── google.strategy.ts      # Stratégie Passport Google OAuth2
│   └── github.strategy.ts      # Stratégie Passport GitHub OAuth2
└── services/
    ├── session.service.ts      # CRUD sessions + rotation + nettoyage
    └── email.service.ts        # Envoi emails (SMTP / console dev)
```

---

## Tests

### Test rapide avec curl

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","name":"Test User","tenantId":"default"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}'

# 3. Sauvegarder les tokens
# ACCESS_TOKEN=eyJhbG...
# REFRESH_TOKEN=eyJhbG...

# 4. Voir les sessions
curl -X GET http://localhost:3000/api/auth/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 5. Refresh (rotation)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"

# 6. Forgot password (email affiché en console si SMTP non configuré)
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# 7. Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"
```
