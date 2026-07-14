// Teste le controller en isolation : on mocke le service et on vérifie
// que toute erreur qu'il lève est bien transmise à next(err), pas avalée
// ou renvoyée avec un mauvais format. Complète les tests d'intégration
// qui, eux, ne passent quasiment jamais par ces branches catch (les
// requêtes valides ne déclenchent pas d'erreur).

jest.mock('../../../src/services/projectService');
const projectService = require('../../../src/services/projectService');
const projectController = require('../../../src/controllers/projectController');

function buildRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send() { return this; },
  };
}

describe('projectController - propagation des erreurs', () => {
  afterEach(() => jest.clearAllMocks());

  it('getAll transmet une erreur du service à next()', async () => {
    const error = new Error('DB down');
    projectService.getAllProjects.mockRejectedValue(error);
    const next = jest.fn();

    await projectController.getAll({}, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('getOne retourne 200 avec les données sur succès', async () => {
    const project = { id: 1, name: 'Test' };
    projectService.getProjectById.mockResolvedValue(project);
    const res = buildRes();

    await projectController.getOne({ params: { id: '1' } }, res, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(project);
  });

  it('getOne transmet une erreur du service à next()', async () => {
    const error = new Error('introuvable');
    projectService.getProjectById.mockRejectedValue(error);
    const next = jest.fn();

    await projectController.getOne({ params: { id: '999' } }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('create transmet une erreur du service à next()', async () => {
    const error = new Error('contrainte violée');
    projectService.createProject.mockRejectedValue(error);
    const next = jest.fn();

    await projectController.create({ body: {} }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
