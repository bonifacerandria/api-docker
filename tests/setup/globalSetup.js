// tests/setup/globalSetup.js
//
// Exécuté automatiquement par Jest AVANT toute suite de tests, quel que soit
// le script npm utilisé pour le lancer (test, test:coverage, test:integration,
// ou même `npx jest` en direct). Contrairement à un hook "pretest:xxx" dans
// package.json, celui-ci ne peut pas être contourné par erreur.
//
// Applique les migrations sur la base de test. Ne crée PAS la base elle-même
// si elle n'existe pas : l'utilisateur applicatif n'a volontairement pas le
// privilège CREATEDB (principe du moindre privilège, même en environnement
// de test) -> la base doit être créée une fois, manuellement ou via un
// utilisateur admin dédié en CI (voir module 8).

require('dotenv').config({ path: '.env.test' });
const { execSync } = require('child_process');

module.exports = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || !databaseUrl.includes('test')) {
    throw new Error(
      'DATABASE_URL ne pointe pas vers une base de test (le nom doit contenir '
      + '"test"). Vérifie .env.test ou les variables injectées par docker-compose.',
    );
  }

  console.log('\n[globalSetup] Application des migrations sur la base de test...');

  try {
    execSync('npx node-pg-migrate up', { stdio: 'pipe', env: process.env });
    console.log('[globalSetup] Migrations OK.');
  } catch (err) {
    const output = `${err.stdout || ''}${err.stderr || ''}`;

    if (/database .* does not exist/i.test(output)) {
      const dbName = new URL(databaseUrl).pathname.replace(/^\//, '');
      throw new Error(
        `\nLa base de test "${dbName}" n'existe pas encore. Crée-la UNE SEULE FOIS avec :\n\n`
        + `  docker compose exec db psql -U <utilisateur> -d postgres -c "CREATE DATABASE ${dbName};"\n\n`
        + 'Puis relance les tests.',
      );
    }

    console.error(output);
    throw new Error('Échec des migrations sur la base de test (voir détails ci-dessus).');
  }
};
