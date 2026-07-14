jest.mock('../../../src/services/taskService');
const taskService = require('../../../src/services/taskService');
const taskController = require('../../../src/controllers/taskController');

function buildRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send() { return this; },
  };
}

describe('taskController - propagation des erreurs', () => {
  afterEach(() => jest.clearAllMocks());

  it('getAll transmet une erreur du service à next()', async () => {
    const error = new Error('DB down');
    taskService.getAllTasks.mockRejectedValue(error);
    const next = jest.fn();

    await taskController.getAll({ query: {} }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('getOne transmet une erreur du service à next()', async () => {
    const error = new Error('introuvable');
    taskService.getTaskById.mockRejectedValue(error);
    const next = jest.fn();

    await taskController.getOne({ params: { id: '999' } }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('update transmet une erreur du service à next()', async () => {
    const error = new Error('contrainte violée');
    taskService.updateTask.mockRejectedValue(error);
    const next = jest.fn();

    await taskController.update({ params: { id: '1' }, body: {} }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('remove transmet une erreur du service à next()', async () => {
    const error = new Error('contrainte violée');
    taskService.deleteTask.mockRejectedValue(error);
    const next = jest.fn();

    await taskController.remove({ params: { id: '1' } }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
