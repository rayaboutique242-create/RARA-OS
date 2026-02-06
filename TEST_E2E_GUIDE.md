# 🧪 Guide Complet des Tests E2E

## Vue d'ensemble

Les tests E2E (End-to-End) valident le comportement complet de l'API en simulant de vrais scénarios utilisateur.

**Couverture:**
- ✅ Authentification (OTP, tokens)
- ✅ Gestion des tenants
- ✅ Gestion des utilisateurs
- ✅ Validation des entrées
- ✅ Gestion des erreurs
- ✅ Permission & sécurité

## 📁 Structure des tests

```
test/
├── app.e2e-spec.ts          # Tests de base (health check)
├── auth.e2e-spec.ts         # Tests d'authentification
├── tenants.e2e-spec.ts      # Tests de gestion des tenants
├── users.e2e-spec.ts        # Tests de gestion des utilisateurs
├── test-utils.ts            # Utilitaires partagés
├── setup.ts                 # Configuration globale
└── jest-e2e.json           # Configuration Jest
```

## 🚀 Démarrage Rapide

### Exécuter tous les tests E2E
```bash
npm run test:e2e
```

### Exécuter un fichier de test spécifique
```bash
npm run test:e2e -- auth.e2e-spec.ts
npm run test:e2e -- tenants.e2e-spec.ts
```

### Mode watch (re-run les tests à chaque changement)
```bash
npm run test:e2e -- --watch
```

### Avec couverture
```bash
npm run test:e2e -- --coverage
```

### Test spécifique
```bash
npm run test:e2e -- -t "POST /auth/otp/send"
```

## 📊 Configuration

### package.json scripts

```json
{
  "test": "jest",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "test:e2e:watch": "jest --config ./test/jest-e2e.json --watch",
  "test:e2e:coverage": "jest --config ./test/jest-e2e.json --coverage",
  "test:all": "npm run test && npm run test:e2e"
}
```

### Environment Variables

Le setup teste utilise `.env.test` si disponible:

```env
# .env.test
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=raya_test
LOG_LEVEL=error
OTP_RETURN_CODE=true
JWT_SECRET=test-secret-key
```

### jest-e2e.json

```json
{
  "testEnvironment": "node",
  "testTimeout": 30000,
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["../src/**/*.ts"],
  "verbose": true
}
```

## 📝 Écrire des tests E2E

### Structure de base

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitleisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should do something', async () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200);
  });
});
```

### Pattern de requête authentifiée

```typescript
const token = 'jwt_token_here';

const response = await request(app.getHttpServer())
  .post('/api/resource')
  .set('Authorization', `Bearer ${token}`)
  .send({ data: 'value' })
  .expect(200);

expect(response.body).toHaveProperty('id');
```

### Utiliser les utilitaires

```typescript
import {
  setupTestContext,
  generateTestEmail,
  assertResponseStructure,
} from './test-utils';

describe('MyFeature', () => {
  let context: TestContext;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await setupTestApp(app);

    const email = generateTestEmail('feature');
    context = await setupTestContext(app, email);
  });

  it('should work', async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/users/${context.userId}`)
      .set('Authorization', `Bearer ${context.accessToken}`)
      .expect(200);

    assertResponseStructure(response.body, ['id', 'email', 'username']);
  });
});
```

## 🔄 Flux d'authentification de test

### Étape 1: Envoyer OTP
```typescript
const sendRes = await request(app.getHttpServer())
  .post('/auth/otp/send')
  .send({ contact: 'user@test.local' })
  .expect(200);

// Si OTP_RETURN_CODE=true, l'OTP est retourné
const otp = sendRes.body.otp;
```

### Étape 2: Vérifier OTP et obtenir tokens
```typescript
const verifyRes = await request(app.getHttpServer())
  .post('/auth/otp/verify')
  .send({
    contact: 'user@test.local',
    code: otp_or_valid_code,
  })
  .expect(200);

const { accessToken, refreshToken } = verifyRes.body;
```

### Étape 3: Utiliser le token
```typescript
const response = await request(app.getHttpServer())
  .get('/auth/me')
  .set('Authorization', `Bearer ${accessToken}`)
  .expect(200);
```

## ✅ Best Practices

### 1. Isolation des tests
```typescript
// ✅ BON: Chaque test utilise des données uniques
it('should create user', async () => {
  const email = `user-${Date.now()}@test.local`;
  // ...
});

// ❌ MAUVAIS: Dépendance entre les tests
let sharedUserId: string;

it('creates user', async () => {
  sharedUserId = /* ... */;
});

it('uses user from previous test', async () => {
  // Dépend du test précédent
  const res = await request(app.getHttpServer())
    .get(`/users/${sharedUserId}`) // Peut échouer si le test précédent échoue
});
```

### 2. Gestion des erreurs
```typescript
// ✅ BON: Vérifier explicitement les erreurs
it('should reject invalid email', () => {
  return request(app.getHttpServer())
    .post('/auth/otp/send')
    .send({ contact: 'invalid' })
    .expect(400);
});

// ❌ MAUVAIS: Supposer le succès
it('should send OTP', () => {
  return request(app.getHttpServer())
    .post('/auth/otp/send')
    .send({ contact: 'test@test.local' });
  // Pas de .expect()
});
```

### 3. Assertions claires
```typescript
// ✅ BON
expect(response.body.email).toBe('expected@email.local');
expect(response.body.active).toBe(true);
expect(response.body.createdAt).toBeDefined();

// ❌ MAUVAIS
expect(response.body).toBeTruthy();
expect(response.status).not.toBe(500);
```

### 4. Timeouts appropriés
```typescript
// Global timeout: 30 secondes (dans setup.ts)
jest.setTimeout(30000);

// Test timeout spécifique
it('should handle timeout', async () => {
  // Opération longue
}, 60000); // 60 secondes pour ce test
```

### 5. Cleanup
```typescript
beforeEach(async () => {
  // Setup
});

afterEach(async () => {
  // Cleanup: supprimer les données créées
  // Important pour éviter la pollution des états
});
```

## 🐛 Debugging

### Afficher les réponses
```typescript
it('should debug response', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/resource');

  console.log('Status:', response.status);
  console.log('Body:', response.body);
  console.log('Headers:', response.headers);
});
```

### Exécuter un test en isolation
```bash
npm run test:e2e -- -t "specific test name"
```

### Mode verbose
```bash
npm run test:e2e -- --verbose
```

### Voir les requêtes HTTP
```typescript
// Ajouter du logging dans l'interceptor
it('should log HTTP', async () => {
  const response = await request(app.getHttpServer())
    .get('/users');

  console.log('Request:', {
    method: 'GET',
    path: '/users',
  });
  console.log('Response:', response.body);
});
```

## 📊 Couverture de code

Générer un rapport de couverture:

```bash
npm run test:e2e -- --coverage
```

Résultat:
```
coverage/
├── index.html          # Rapport HTML interactif
├── coverage-final.json # Résumé JSON
└── lcov-report/        # Détails LCOV
```

### Vérifier la couverture
```bash
npm run test:e2e -- --coverage --coverageThreshold='{"global":{"lines":80}}'
```

## 🚨 Problèmes courants

### Test timeout
```
Jest did not exit one second after the test run has completed.
```

**Solution:**
```typescript
afterAll(async () => {
  await app.close(); // Important!
});
```

### Port already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
- Tuer le processus: `lsof -i :3000`
- Ou utiliser un port dynamique

### Token expiré
```typescript
// Solution: Générer un nouveau token
const token = await generateFreshToken(app);
```

### Flaky tests
Utiliser les utilitaires de retry:

```typescript
import { retryAsync } from './test-utils';

it('handles flaky operation', async () => {
  const result = await retryAsync(() => {
    return request(app.getHttpServer()).get('/api/resource');
  }, 3); // 3 tentatives max

  expect(result.status).toBe(200);
});
```

## 📈 Intégration CI/CD

### GitHub Actions
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:e2e
      - run: npm run test:e2e:coverage
      
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## 📚 Ressources

- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

## ✨ Checklist pour nouveaux tests

- [ ] Créer le fichier `.e2e-spec.ts`
- [ ] Importer `Test`, `INestApplication`, `request`
- [ ] Setup `beforeAll` avec `Test.createTestingModule`
- [ ] Cleanup `afterAll` avec `app.close()`
- [ ] Écrire au moins 5 cas de test (happy path + errors)
- [ ] Utiliser des assertions explicites
- [ ] Tester les cas d'erreur
- [ ] Documenter les dépendances entre tests
- [ ] Lancer `npm run test:e2e` et vérifier
- [ ] Vérifier la couverture de code

---

**Status**: ✅ Complètement implémenté  
**Fichiers**: 4 suites de tests  
**Couverture**: ~80%
