const pool = require('../../src/config/db');

/**
 * Vide toutes les tables entre chaque test d'intégration, sans les
 * recréer (TRUNCATE est bien plus rapide que de rejouer les migrations).
 * RESTART IDENTITY réinitialise aussi les séquences SERIAL -> chaque test
 * peut compter sur des ids prévisibles (1, 2, 3...) sans dépendre de
 * l'ordre d'exécution des tests précédents.
 */
async function resetDb() {
  await pool.query('TRUNCATE TABLE tasks, projects RESTART IDENTITY CASCADE');
}

async function closeDb() {
  await pool.end();
}

module.exports = { resetDb, closeDb };
