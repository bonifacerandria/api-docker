const config = require('../../../src/config/config');
const errorHandler = require('../../../src/middlewares/errorHandler');
const AppError = require('../../../src/utils/AppError');

// Middleware testé en isolation, avec de faux req/res/next -> pas besoin
// de monter toute l'app Express pour ça.
function buildRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('errorHandler middleware', () => {
  const originalEnv = config.env;
  afterEach(() => {
    config.env = originalEnv;
  });

  it('en mode development, renvoie le message et la stack complète', () => {
    config.env = 'development';
    const res = buildRes();
    const err = new AppError('Erreur de test', 400);

    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Erreur de test');
    expect(res.body.stack).toBeDefined();
  });

  it('en production, une erreur opérationnelle renvoie juste le message', () => {
    config.env = 'production';
    const res = buildRes();
    const err = new AppError('Projet introuvable', 404);

    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: 'fail', message: 'Projet introuvable' });
    expect(res.body.stack).toBeUndefined();
  });

  it('en production, une erreur NON opérationnelle est masquée (500 générique)', () => {
    config.env = 'production';
    const res = buildRes();
    const bug = new Error('TypeError interne inattendu'); // pas une AppError -> isOperational absent

    errorHandler(bug, {}, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Une erreur interne est survenue.');
    expect(res.body.message).not.toContain('TypeError');
  });
});
