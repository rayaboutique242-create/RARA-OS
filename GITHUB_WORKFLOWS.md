# GitHub Actions Workflows Reference

## Overview

This document describes all GitHub Actions workflows configured for RAYA Backend CI/CD.

## Workflows Summary

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI/CD Pipeline | `ci-cd.yml` | Push to main/develop, PRs | Build, test, and deploy |
| Code Quality | `code-quality.yml` | PR, push to main/develop | Lint, format, security checks |
| E2E Tests | `e2e-tests.yml` | Push/PR | Comprehensive end-to-end tests |
| Docker Build | `docker-build.yml` | On successful build | Build and push Docker images |
| Release | `release.yml` | Version change on main | Automated versioning and release |

## CI/CD Pipeline (`ci-cd.yml`)

### Trigger Events
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Create version tags (v1.0.0)

### Jobs

#### 1. Lint & Type Check
```yaml
- Runs: ESLint and TypeScript compilation
- Fails on: Lint errors, type errors
- Time: ~30 seconds
```

#### 2. Unit Tests
```yaml
- Runs: Jest test suite with coverage
- Fails on: Test failures, coverage below threshold
- Coverage: Uploaded to Codecov
- Time: ~60 seconds
```

#### 3. E2E Tests  
```yaml
- Runs: 42+ integration tests
- Fails on: E2E test failures
- Time: ~120 seconds
- Environment: test (with test database)
```

#### 4. Build
```yaml
- Runs: Production build with NestJS
- Output: dist/ directory
- Artifact: Stored for 7 days
- Time: ~45 seconds
```

#### 5. Docker Build
```yaml
- Runs only on: main branch pushes or version tags
- Builds: Multi-platform images (amd64, arm64)
- Registry: GitHub Container Registry
- Tags: 
  - Branch name
  - Semantic version
  - Commit SHA
- Time: ~3-5 minutes
```

#### 6. Deploy Staging
```yaml
- Trigger: Push to develop
- Environment: staging
- Steps:
  1. Pull latest Docker image
  2. Run database migrations
  3. Start new container
  4. Run smoke tests
  5. Notify team
- Time: ~2-3 minutes
```

#### 7. Deploy Production
```yaml
- Trigger: Version tag (v1.0.0)
- Environment: production
- Approval: Required from team
- Steps:
  1. Pull Docker image
  2. Run database migrations
  3. Backup current deployment
  4. Start new container
  5. Health checks
  6. Create GitHub Release
- Time: ~3-4 minutes
```

## Code Quality (`code-quality.yml`)

### Checks Performed

#### Prettier Format Check
```bash
# Verifies all TypeScript files conform to Prettier format
npx prettier --check "src/**/*.ts" "test/**/*.ts"
```

#### ESLint Analysis
```bash
# Runs ESLint rules on all source files
npm run lint
# Reports violations with fix suggestions
```

#### TypeScript Strict Mode
```bash
# TypeScript compilation in strict mode
npx tsc --noEmit --strict
# Catches type mismatches and null safety issues
```

#### Dependency Security
```bash
# Checks for known vulnerabilities
npm audit --audit-level=moderate
# Fails on critical vulnerabilities
```

#### Unused Imports
```bash
# Detects and reports unused imports
npx eslint src --rule "no-unused-vars: error"
```

#### Build Test
```bash
# Verifies production build succeeds
npm run build
# Ensures dist/ directory is created
```

#### Coverage Report
```bash
# Runs tests with coverage analysis
npm run test:cov
# Checks if coverage meets 80% threshold
# Fails if below threshold
```

## E2E Tests (`e2e-tests.yml`)

### Test Suites

#### Health Checks (2 tests)
- GET /health - Basic health check
- GET /health/db - Database connectivity

#### Authentication (12 tests)
- Local authentication
- JWT token generation
- Token refresh
- Token expiry
- Permission validation

#### Multi-Tenant (10 tests)
- Tenant isolation
- Resource filtering by tenant
- Multi-tenant queries
- Data segmentation

#### Users (15+ tests)
- User CRUD operations
- Role-based access
- Profile updates
- permission management

### Configuration

```yaml
NODE_ENV: test
JWT_SECRET: test-secret-key
JWT_REFRESH_SECRET: test-refresh-secret
DATABASE_URL: sqlite:test.db
```

### Execution

```bash
# Runs on:
npm run test:e2e

# With coverage:
npm run test:e2e:coverage

# Watch mode (local only):
npm run test:e2e:watch
```

## Release Workflow (`release.yml`)

### Automatic Versioning

**Trigger**: Changes to `package.json` version on `main` branch

**Steps**:

1. **Check Version Change**
```bash
# Compares current vs previous version
# If different, proceeds with release
```

2. **Build & Test**
```bash
# Runs all tests and checks
# Ensures quality before release
```

3. **Build Docker Image**
```bash
# Creates Docker image with:
# - Version tag (e.g., 1.2.3)
# - Major.minor tags
# - Latest tag
```

4. **Create Git Tag**
```bash
# Creates annotated Git tag: v1.2.3
# Pushes to repository
```

5. **Create GitHub Release**
```bash
# Creates release with changelog
# Links to Docker image
# Provides installation instructions
```

6. **Send Notifications**
```bash
# Slack notification with:
# - Version number
# - Docker image URL
# - Release link
```

## Manual Workflow Runs

### Trigger Via GitHub CLI

```bash
# Run test workflow on specific branch
gh run create -w ci-cd.yml --ref develop

# Run release workflow
gh run create -w release.yml

# View workflows
gh run list

# View specific run logs
gh run view <run-id> --log
```

### Trigger Via GitHub UI

1. Go to **Actions** tab
2. Select workflow from left sidebar
3. Click **Run workflow**
4. Select branch/parameters
5. Click **Run workflow**

## Secrets Configuration

Required GitHub secrets:

```yaml
CODECOV_TOKEN
  - Purpose: Upload test coverage
  - Obtained: codecov.io

STAGING_HOST
  - Purpose: SSH connection to staging
  - Example: staging.example.com

STAGING_SSH_KEY
  - Purpose: Private SSH key for staging
  - Format: PEM format, no passphrase

PRODUCTION_HOST
  - Purpose: SSH connection to production
  - Example: api.example.com

PRODUCTION_SSH_KEY
  - Purpose: Private SSH key for production
  - Format: PEM format, no passphrase

SLACK_WEBHOOK
  - Purpose: Send notifications to Slack
  - Format: https://hooks.slack.com/services/...
```

## Viewing Workflow Runs

### GitHub Web UI

1. Repository → Actions
2. Select workflow from list
3. Click on specific run
4. View logs for each job

### GitHub CLI

```bash
# List recent runs
gh run list --repo owner/repo

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# View log for specific job
gh run view <run-id> --job <job-id>

# Re-run workflow
gh run rerun <run-id>

# Cancel workflow
gh run cancel <run-id>
```

## Workflow Metrics

### Typical Execution Times

| Stage | Time |
|-------|------|
| Lint & Type Check | 30 sec |
| Unit Tests | 60 sec |
| E2E Tests | 120 sec |
| Build | 45 sec |
| Docker Build | 3-5 min |
| Deploy Staging | 2-3 min |
| **Total (Dev Push)** | **~10 min** |
| **Total (Prod Deploy)** | **~15 min** |

### Success Rates

- Lint checks: >95% (usually pre-commit hooks catch errors)
- Unit tests: >99% (rare flakes)
- E2E tests: >95% (occasional timing issues)
- Builds: ~99% (rare dependency issues)

## Troubleshooting

### Workflow Fails

**Check logs:**
```bash
gh run view <run-id> --log
```

**Common failures:**
- ESLint violations → `npm run lint`
- Test failures → `npm run test`
- Build errors → `npm run build`
- Type errors → `npx tsc --noEmit`

### Slow Workflows

**Typical causes:**
- Dependency installation - Use npm ci locally
- Large tests - Consider splitting into multiple jobs
- Docker building - Use cache layer

**Optimization:**
- GitHub Actions cache for node_modules
- Docker layer caching
- Parallel job execution

### Stuck Workflows

```bash
# View running jobs
gh run list --ref develop --status in_progress

# Cancel stuck run
gh run cancel <run-id>

# Re-run
gh run rerun <run-id>
```

## Best Practices

1. **Keep workflows simple** - One concern per job
2. **Use caching** - Speed up repeated operations
3. **Fail fast** - Run quick checks first (lint before tests)
4. **Test locally first** - Don't rely on CI for catches
5. **Review CI logs** - Understand each failure
6. **Tag releases properly** - Semantic versioning
7. **Automate the boring stuff** - Let CI handle repetitive tasks

---

**Last Updated**: February 5, 2026
**Version**: 1.0.0
