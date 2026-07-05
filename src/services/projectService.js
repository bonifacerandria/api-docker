const projectRepository = require('../repositories/projectRepository');
const taskRepository = require('../repositories/taskRepository');
const AppError = require('../utils/AppError');

/**
 * Couche service : contient les RÈGLES MÉTIER.
 * Les fonctions sont maintenant asynchrones car le repository fait de
 * vraies requêtes réseau vers PostgreSQL -> ça se propage jusqu'aux
 * controllers, mais aucune règle métier n'a changé.
 */

async function getAllProjects() {
  return projectRepository.findAll();
}

async function getProjectById(id) {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw new AppError(`Aucun projet trouvé avec l'id ${id}`, 404);
  }
  return project;
}

async function createProject(data) {
  return projectRepository.create(data);
}

async function updateProject(id, updates) {
  const project = await projectRepository.update(id, updates);
  if (!project) {
    throw new AppError(`Aucun projet trouvé avec l'id ${id}`, 404);
  }
  return project;
}

async function deleteProject(id, { force = false } = {}) {
  const taskCount = await taskRepository.countByProject(id);
  if (taskCount > 0 && !force) {
    throw new AppError(
      `Impossible de supprimer le projet ${id} : il contient ${taskCount} tâche(s). `
      + 'Ajoutez ?force=true pour forcer la suppression.',
      409,
    );
  }

  const deleted = await projectRepository.remove(id);
  if (!deleted) {
    throw new AppError(`Aucun projet trouvé avec l'id ${id}`, 404);
  }
}

module.exports = {
  getAllProjects, getProjectById, createProject, updateProject, deleteProject,
};
