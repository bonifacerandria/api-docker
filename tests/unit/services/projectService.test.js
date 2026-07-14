// Tests UNITAIRES : aucune connexion réseau, aucune base de données.
// On mocke les repositories pour isoler et tester UNIQUEMENT les règles
// métier du service. Ces tests doivent rester rapides (millisecondes) -
// c'est ce qui permet de les lancer en boucle pendant le développement.

jest.mock('../../../src/repositories/projectRepository');
jest.mock('../../../src/repositories/taskRepository');

const projectRepository = require('../../../src/repositories/projectRepository');
const taskRepository = require('../../../src/repositories/taskRepository');
const projectService = require('../../../src/services/projectService');
const AppError = require('../../../src/utils/AppError');

describe('projectService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectById', () => {
    it('retourne le projet quand il existe', async () => {
      const fakeProject = { id: 1, name: 'Test' };
      projectRepository.findById.mockResolvedValue(fakeProject);

      const result = await projectService.getProjectById(1);

      expect(result).toEqual(fakeProject);
      expect(projectRepository.findById).toHaveBeenCalledWith(1);
    });

    it("lève une AppError 404 quand le projet n'existe pas", async () => {
      projectRepository.findById.mockResolvedValue(null);

      await expect(projectService.getProjectById(999)).rejects.toMatchObject({
        statusCode: 404,
        isOperational: true,
      });
    });
  });

  describe('deleteProject - règle métier de suppression protégée', () => {
    it('refuse de supprimer un projet avec des tâches sans force (409)', async () => {
      taskRepository.countByProject.mockResolvedValue(3);

      await expect(projectService.deleteProject(1)).rejects.toMatchObject({
        statusCode: 409,
      });

      // La suppression ne doit JAMAIS être tentée si la règle bloque en amont.
      expect(projectRepository.remove).not.toHaveBeenCalled();
    });

    it('autorise la suppression avec force=true même avec des tâches', async () => {
      taskRepository.countByProject.mockResolvedValue(3);
      projectRepository.remove.mockResolvedValue(true);

      await expect(projectService.deleteProject(1, { force: true })).resolves.toBeUndefined();
      expect(projectRepository.remove).toHaveBeenCalledWith(1);
    });

    it("autorise la suppression sans force si le projet n'a aucune tâche", async () => {
      taskRepository.countByProject.mockResolvedValue(0);
      projectRepository.remove.mockResolvedValue(true);

      await expect(projectService.deleteProject(1)).resolves.toBeUndefined();
    });

    it("lève une AppError 404 si le projet à supprimer n'existe pas", async () => {
      taskRepository.countByProject.mockResolvedValue(0);
      projectRepository.remove.mockResolvedValue(false);

      await expect(projectService.deleteProject(999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getAllProjects', () => {
    it('délègue directement au repository', async () => {
      const fakeProjects = [{ id: 1 }, { id: 2 }];
      projectRepository.findAll.mockResolvedValue(fakeProjects);

      const result = await projectService.getAllProjects();

      expect(result).toEqual(fakeProjects);
    });
  });

  describe('updateProject', () => {
    it('retourne le projet mis à jour quand il existe', async () => {
      const updated = { id: 1, name: 'Nom modifié' };
      projectRepository.update.mockResolvedValue(updated);

      const result = await projectService.updateProject(1, { name: 'Nom modifié' });

      expect(result).toEqual(updated);
    });

    it("lève une AppError 404 si le projet à mettre à jour n'existe pas", async () => {
      projectRepository.update.mockResolvedValue(null);

      await expect(projectService.updateProject(999, { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('createProject', () => {
    it('délègue directement au repository', async () => {
      const payload = { name: 'Nouveau projet' };
      const created = { id: 1, ...payload };
      projectRepository.create.mockResolvedValue(created);

      const result = await projectService.createProject(payload);

      expect(result).toEqual(created);
      expect(projectRepository.create).toHaveBeenCalledWith(payload);
    });
  });
});
