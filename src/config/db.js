const { Pool } = require('pg');

/**
 * Pool de connexions PostgreSQL partagé par toute l'application.
 * Un seul pool est créé au démarrage et réutilisé partout : ouvrir une
 * connexion par requête serait beaucoup trop coûteux en production.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Une connexion "idle" du pool qui plante (ex: DB redémarrée) ne doit pas
// planter le process silencieusement sans log -> on log puis on arrête
// proprement pour que systemd/Docker puisse redémarrer l'app (module 10).
pool.on('error', (err) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL du pool :', err);
  process.exit(1);
});

module.exports = pool;
