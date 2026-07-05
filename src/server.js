const app = require('./app');
const config = require('./config/config');
const pool = require('./config/db');

const server = app.listen(config.port, () => {
  console.log(`🚀 TaskFlow API démarrée en mode "${config.env}" sur le port ${config.port}`);
});

// Bonne pratique DevOps : capturer les erreurs non gérées pour éviter
// qu'un process zombie reste en vie sans pouvoir répondre (important
// pour les orchestrateurs comme Kubernetes qui se basent sur l'état du process).
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION 💥 Arrêt du serveur...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM reçu, arrêt propre du serveur...');
  server.close(async () => {
    await pool.end();
    console.log('Process terminé (pool PostgreSQL fermé).');
  });
});
