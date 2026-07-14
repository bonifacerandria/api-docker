jest.mock('../../../src/repositories/taskRepository');
jest.mock('../../../src/repositories/projectRepository');

const taskRepository = require('../../../src/repositories/taskRepository');
const projectRepository = require('../../../src/repositories/projectRepository');
const taskService = require('../../../src/services/taskService');

describe('taskService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateTaskStatus - workflow contrôlé', () => {
    // Table de vérité complète des transitions : c'est la règle métier la
    // plus critique de l'app, elle mérite d'être testée exhaustivement,
    // pas juste sur un ou deux cas.
    const cases = [
      { from: 'todo', to: 'in_progress', shouldSucceed: true },
      { from: 'todo', to: 'done', shouldSucceed: false },
      { from: 'in_progress', to: 'done', shouldSucceed: true },
      { from: 'in_progress', to: 'todo', shouldSucceed: true },
      { from: 'done', to: 'in_progress', shouldSucceed: true },
      { from: 'done', to: 'todo', shouldSucceed: false },
    ];

    test.each(cases)(
      '$from -> $to : $shouldSucceed',
      async ({ from, to, shouldSucceed }) => {
        taskRepository.findById.mockResolvedValue({ id: 1, status: from });
        taskRepository.update.mockResolvedValue({ id: 1, status: to });

        const action = taskService.updateTaskStatus(1, to);

        if (shouldSucceed) {
          await expect(action).resolves.toMatchObject({ status: to });
        } else {
          await expect(action).rejects.toMatchObject({ statusCode: 400 });
        }
      },
    );
  });

  describe('updateTaskStatus - cas limites', () => {
    it("lève une AppError 404 si la tâche n'existe pas", async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(taskService.updateTaskStatus(999, 'in_progress')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('updateTask', () => {
    it('retourne la tâche mise à jour quand elle existe', async () => {
      const updated = { id: 1, title: 'Titre modifié' };
      taskRepository.update.mockResolvedValue(updated);

      const result = await taskService.updateTask(1, { title: 'Titre modifié' });

      expect(result).toEqual(updated);
    });

    it("lève une AppError 404 si la tâche à mettre à jour n'existe pas", async () => {
      taskRepository.update.mockResolvedValue(null);

      await expect(taskService.updateTask(999, { title: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteTask', () => {
    it('supprime la tâche quand elle existe', async () => {
      taskRepository.remove.mockResolvedValue(true);
      await expect(taskService.deleteTask(1)).resolves.toBeUndefined();
    });

    it("lève une AppError 404 si la tâche à supprimer n'existe pas", async () => {
      taskRepository.remove.mockResolvedValue(false);
      await expect(taskService.deleteTask(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllTasks', () => {
    it('délègue directement au repository avec les filtres', async () => {
      const fakeTasks = [{ id: 1 }];
      taskRepository.findAll.mockResolvedValue(fakeTasks);

      const result = await taskService.getAllTasks({ status: 'todo' });

      expect(result).toEqual(fakeTasks);
      expect(taskRepository.findAll).toHaveBeenCalledWith({ status: 'todo' });
    });
  });

  describe('createTask', () => {
    it("refuse la création si le projet n'existe pas (400)", async () => {
      projectRepository.findById.mockResolvedValue(null);

      await expect(
        taskService.createTask({ projectId: 999, title: 'Test' }),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('crée la tâche si le projet existe', async () => {
      projectRepository.findById.mockResolvedValue({ id: 1, name: 'Projet' });
      const created = { id: 1, projectId: 1, title: 'Test' };
      taskRepository.create.mockResolvedValue(created);

      const result = await taskService.createTask({ projectId: 1, title: 'Test' });

      expect(result).toEqual(created);
    });
  });
});
