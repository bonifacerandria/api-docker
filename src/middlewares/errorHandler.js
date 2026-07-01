const config = require('../config/config');

/**
 * Middleware d'erreur global. Express le reconnaît car il a 4 arguments.
 * Doit être déclaré en tout dernier dans app.js.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // En dev : on donne le maximum de détails pour déboguer vite.
  if (config.env === 'development') {
    return res.status(statusCode).json({
      status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // En production : on ne fuite jamais les détails d'une erreur non-opérationnelle
  // (bug interne, exception non prévue) — juste un message générique + log serveur.
  if (err.isOperational) {
    return res.status(statusCode).json({
      status,
      message: err.message,
    });
  }

  console.error('ERREUR NON OPÉRATIONNELLE 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Une erreur interne est survenue.',
  });
}

module.exports = errorHandler;
