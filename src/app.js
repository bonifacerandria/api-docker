const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/config');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// --- Middlewares globaux ---
app.use(helmet()); // en-têtes HTTP de sécurité de base (module 15 ira plus loin)
app.use(cors());
app.use(express.json());
if (config.env !== 'test') {
  app.use(morgan(config.logLevel));
}

// --- Health check ---
// Indispensable dès maintenant : Docker (module 3) et Kubernetes (module 16)
// s'en serviront pour savoir si le conteneur/pod est vivant et prêt.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: config.env,
  });
});

// --- Routes métier ---
app.use(config.apiPrefix, routes);

// --- 404 pour toute route inconnue ---
app.all('*', (req, res, next) => {
  next(new AppError(`Route introuvable : ${req.originalUrl}`, 404));
});

// --- Gestionnaire d'erreurs global (toujours en dernier) ---
app.use(errorHandler);

module.exports = app;
