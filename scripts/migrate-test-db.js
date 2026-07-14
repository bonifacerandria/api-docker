// scripts/migrate-test-db.js
// Exécute les migrations sur la base définie dans .env.test, pas .env.
// Utilisé avant les tests d'intégration (voir "pretest:integration" dans
// package.json) et par la CI au module 8.

require('dotenv').config({ path: '.env.test' });
const { execSync } = require('child_process');

execSync('npx node-pg-migrate up', { stdio: 'inherit', env: process.env });
