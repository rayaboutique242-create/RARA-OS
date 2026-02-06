# =====================================================
# CI/CD AUTOMATION GUIDE - RAYA BACKEND
# =====================================================

## Overview

This guide covers the complete CI/CD automation system for RAYA Backend, including:
- Automated testing on every commit
- Pre-commit hooks and code quality checks
- Automated builds and Docker image creation
- Multi-stage deployment pipeline
- Database migration automation
- Version management and releases
- Rollback capabilities

## Quick Start

### 1. Initial Setup

```bash
cd raya-backend
npm install
npm run prepare  # Setup husky pre-commit hooks
```

### 2. Enable Pre-commit Hooks

Pre-commit hooks automatically:
- Run ESLint and fix formatting issues
- Run unit tests
- Check TypeScript compilation
- Validate commit messages

```bash
# Hooks are automatically installed
# Commit as normal - hooks run automatically
git commit -m "feat: add new feature"
```

### 3. Local Workflow

```bash
# Development
npm run start:dev

# Testing
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:all          # All tests

# Linting
npm run lint              # ESLint with auto-fix

# Building
npm run build             # Production build
npm run start:prod        # Run production build
```

## GitHub Actions Workflows

### 1. **CI Pipeline** (`.github/workflows/ci-cd.yml`)

Runs on every push to `main` and `develop`, or any pull request.

**Jobs:**
- **Lint & Type Check**: ESLint + TypeScript compilation
- **Unit Tests**: Jest with coverage
- **E2E Tests**: Complete application testing
- **Build**: Production build artifact creation
- **Docker Build**: Multi-platform Docker image building
- **Deploy Staging**: Auto-deployment on `develop` push
- **Deploy Production**: Manual deployment on version tags

**Triggers:**
```yaml
- push to main or develop branches
- any pull request to main or develop
- version tags (v1.0.0, etc.)
```

### 2. **Code Quality** (`.github/workflows/code-quality.yml`)

Runs automated code analysis on pull requests.

**Checks:**
- ESLint violations
- Prettier formatting
- Unused imports
- TypeScript strict mode
- Code duplication analysis

### 3. **Docker Build** (`.github/workflows/docker-build.yml`)

Automatic Docker image building and registry push.

**Features:**
- Multi-platform builds (amd64, arm64)
- Automatic tagging (branch, semver, sha)
- Registry caching for faster builds

### 4. **E2E Tests** (`.github/workflows/e2e-tests.yml`)

Comprehensive end-to-end testing.

**Coverage:**
- 42+ test cases
- Health checks
- Authentication flows
- Multi-tenant operations
- User management

### 5. **Release** (`.github/workflows/release.yml`)

Automated versioning and release creation.

**Process:**
1. Detects version changes in `package.json`
2. Creates Git tag
3. Builds and pushes Docker image
4. Creates GitHub Release with changelog
5. Deploys to production

## Pre-commit Hooks Setup

### Husky + Lint-Staged

Pre-commit hooks are configured to run automatically on commit.

**Configuration File:** `.husky/pre-commit`

**Runs on every commit:**
```bash
# 1. Lint and fix staging files
npm run lint -- --fix

# 2. Format code
npm run format

# 3. Run unit tests
npm run test -- --passWithNoTests

# 4. Validate TypeScript
npx tsc --noEmit
```

**Skip hooks (if needed):**
```bash
git commit --no-verify -m "emergency fix"
```

### Commit Message Format

Uses Conventional Commits for automatic changelog generation:

```
feat: add new feature                    # New feature
fix: resolve bug                         # Bug fix
perf: improve performance                # Performance improvement
docs: update documentation               # Documentation
style: code formatting                   # Style changes
refactor: restructure code                # Code refactoring
test: add/update tests                   # Test changes
chore: update dependencies               # Maintenance
ci: update CI/CD config                  # CI/CD changes
```

Example:
```bash
git commit -m "feat: add cache layer for queries"
git commit -m "fix(auth): resolve token expiry issue"
```

## Deployment Pipeline

### Staging Deployment (Automatic)

**Trigger:** Push to `develop` branch

**Steps:**
1. Run all tests and linting
2. Build application
3. Create Docker image
4. Push to registry
5. Deploy to staging server
6. Run smoke tests
7. Notify team

**Access:**
- URL: https://staging-api.raya-boutique.com
- Requires VPN access

### Production Deployment

**Trigger:** Create version tag (e.g., `v1.2.3`)

**Manual Process:**
```bash
# 1. Ensure main is up-to-date
git checkout main
git pull origin main

# 2. Update version
npm version patch  # or minor/major

# 3. Push to trigger deployment
git push origin main --tags
```

**Automatic Steps:**
1. Run all tests
2. Build application
3. Create Docker image with version tag
4. Push to registry
5. Create GitHub Release
6. Wait for manual approval in Prod environment
7. Deploy to production

**Approval:**
- Required by at least 1 reviewer
- Only Organization members can approve
- Deployment logs available in GitHub Actions

### Rollback Strategy

**Quick Rollback (Last 5 Deployments):**
```bash
# 1. View recent deployments
gh deployment list --repo your-org/raya-backend

# 2. Rollback to previous version
gh deployment create --environment production --auto-merge --production-environment --ref v1.2.2

# Or manually:
git tag v1.2.3-rollback v1.2.2  # Create rollback tag
git push origin v1.2.3-rollback
```

**Database Rollback:**
```bash
npm run migration:revert
npm run migration:run  # Run previous migrations
```

## Database Migration Automation

### Automatic Migrations on Deploy

On every deployment, migrations automatically run:

```bash
npm run migration:run
```

### Manual Migration Management

```bash
# Generate new migration
npm run migration:generate src/database/migrations/AddNewTable

# Review migration before committing
git add src/database/migrations/
git commit -m "chore: add migration for new table"

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Migration Best Practices

1. **Always generate migrations** - Don't write SQL manually
2. **Test locally first** - Run `npm run migration:run` before committing
3. **Include rollback path** - Ensure `migration:revert` works
4. **One change per migration** - Makes debugging easier
5. **Add meaningful names** - `AddUserProfileTable` not `Migration1`

## Version Management

### Semantic Versioning

RAYA uses Semantic Versioning (MAJOR.MINOR.PATCH):

```
1.2.3
│ │ └─ PATCH: Bug fixes, no API changes
│ └─── MINOR: New features, backward compatible
└───── MAJOR: Breaking changes
```

### Update Version

```bash
# Patch version (1.0.0 → 1.0.1)
npm version patch

# Minor version (1.0.0 → 1.1.0)
npm version minor

# Major version (1.0.0 → 2.0.0)
npm version major
```

Automatically:
1. Updates `package.json` and `package-lock.json`
2. Creates Git commit with version number
3. Creates Git tag
4. Triggers production deployment

## GitHub Secrets Configuration

Required secrets in GitHub repository settings:

```
CODECOV_TOKEN          # Codecov.io integration
STAGING_HOST           # Staging server SSH host
STAGING_SSH_KEY        # Staging server private SSH key
STAGING_SSH_USER       # Staging server username
PRODUCTION_HOST        # Production server SSH host
PRODUCTION_SSH_KEY     # Production server private SSH key
PRODUCTION_SSH_USER    # Production server username
DOCKER_REGISTRY_URL    # Docker registry URL
DOCKER_USERNAME        # Docker registry username
DOCKER_PASSWORD        # Docker registry password
SLACK_WEBHOOK          # Slack notifications
DATABASE_URL_PROD      # Production database URL
DATABASE_URL_STAGING   # Staging database URL
```

## Environment Variables

### Development
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite:database.sqlite
JWT_SECRET=dev-secret
REDIS_URL=redis://localhost:6379
```

### Staging
```bash
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=$(STAGING_JWT_SECRET)
REDIS_URL=redis://staging-redis:6379
```

### Production
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=$(PRODUCTION_JWT_SECRET)
REDIS_URL=redis://prod-redis:6379
LOG_LEVEL=info
```

## Monitoring CI/CD

### GitHub Actions Dashboard

View all workflow runs:
- GitHub repo → Actions tab
- Filter by branch, status, or workflow

### Deployment Events

```bash
# View deployments
gh deployment list

# View deployment status
gh deployment status <deployment-id>

# Check logs
gh run view <run-id>
```

### Notifications

- **Slack**: Deployment status updates
- **Email**: CI failure notifications
- **GitHub**: Pull request checks and comments

## Troubleshooting

### Workflow Fails on Lint

**Cause**: ESLint or Prettier issues

**Fix**:
```bash
# Auto-fix locally
npm run lint
npm run format
git add .
git commit -m "style: auto-format code"
```

### E2E Tests Fail

**Cause**: Database/environment issues

**Fix**:
```bash
# Run tests locally
npm run test:e2e

# Check test database
sqlite3 test.db

# Reset test database
rm test.db
npm run migration:run
npm run test:e2e
```

### Docker Build Fails

**Cause**: Missing dependencies or build step

**Fix**:
```bash
# Build locally
docker build -t raya-backend:test .

# Check Dockerfile
cat Dockerfile

# Verify npm install
npm ci  # Clean install
```

### Deployment Hangs

**Cause**: Database migration timeout or server connectivity

**Fix**:
```bash
# Check logs
gh run view <run-id> --log

# Manual deployment
ssh production-server
cd /app
docker pull ghcr.io/your-org/raya-backend:v1.2.3
docker-compose up -d
```

## Best Practices

1. **Commit Often**: Small, atomic commits are easier to review and revert
2. **Write Tests**: Ensure high test coverage (>80%)
3. **Review PRs**: At least 1 approval required before merge
4. **Test Before Commit**: Never rely solely on CI; test locally first
5. **Keep Dependencies Updated**: Regular security updates
6. **Database Backups**: Always backup before production deployment
7. **Staging Tests**: Always test on staging before production
8. **Document Changes**: Update API docs when changing endpoints

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Semantic Versioning](https://semver.org/)

---

**Last Updated**: February 5, 2026
**Version**: 1.0.0
