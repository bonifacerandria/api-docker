require('dotenv').config();

/**
 * Configuration centralisée de l'application.
 * Toutes les variables d'environnement sont lues ici, nulle part ailleurs,
 * pour garder une seule source de vérité (utile dès qu'on ajoutera Docker/K8s
 * et leurs propres mécanismes d'injection de variables).
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  logLevel: process.env.LOG_LEVEL || 'dev',
};

module.exports = config;
