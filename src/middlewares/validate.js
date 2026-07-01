const AppError = require('../utils/AppError');

/**
 * Middleware factory : prend un schéma Joi et retourne un middleware Express
 * qui valide req.body avant d'atteindre le controller.
 * Ça évite de dupliquer la logique de validation dans chaque controller.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new AppError(`Données invalides : ${message}`, 400));
    }

    req.body = value;
    return next();
  };
}

module.exports = validate;
