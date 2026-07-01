/**
 * Erreur métier "attendue" (ex: ressource introuvable, validation échouée).
 * On la distingue des bugs/erreurs de programmation via `isOperational`,
 * ce qui permet au error handler global de savoir s'il peut renvoyer
 * le message tel quel au client, ou s'il doit le masquer.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
