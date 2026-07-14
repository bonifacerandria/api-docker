// Ces cas ne sont volontairement PAS testables via l'API HTTP : Joi bloque
// déjà les clés inconnues et les updates vides avant d'atteindre le
// repository. On teste ici le repository directement pour vérifier qu'il
// reste robuste par lui-même, indépendamment de la couche de validation
// (défense en profondeur : si un jour un autre appelant contourne Joi,
// le repository ne doit pas planter ni construire du SQL invalide).

const projectRepository = require('../../src/repositories/projectRepository');
const taskRepository = require('../../src/repositories/taskRepository');
const { resetDb, closeDb } = require('../helpers/resetDb');

describe('Repositories - branches défensives', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('projectRepository.update', () => {
    it('ignore les clés non whitelistées et retourne le projet inchangé', async () => {
      const project = await projectRepository.create({ name: 'Original' });

      const result = await projectRepository.update(project.id, { notAColumn: 'hack' });

      expect(result.name).toBe('Original');
    });
  });

  describe('taskRepository.update', () => {
    it('ignore les clés non whitelistées et retourne la tâche inchangée', async () => {
      const project = await projectRepository.create({ name: 'Projet' });
      const task = await taskRepository.create({ projectId: project.id, title: 'Original' });

      const result = await taskRepository.update(task.id, { notAColumn: 'hack' });

      expect(result.title).toBe('Original');
    });
  });
});
