// Chargé automatiquement par Jest avant toute suite de tests (voir
// jest.config.js -> setupFiles). Force NODE_ENV=test et charge .env.test
// pour être certain qu'aucun test ne puisse accidentellement se connecter
// à la base de développement ou de production.
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test')) {
  throw new Error(
    'DATABASE_URL ne semble pas pointer vers une base de test '
    + '(le nom doit contenir "test"). Arrêt pour éviter de TRUNCATE '
    + 'une base de dev/prod par erreur. Vérifie ton fichier .env.test.',
  );
}
