const projectRepository = require('../repositories/projectRepository');
const taskRepository = require('../repositories/taskRepository');
const AppError = require('../utils/AppError');

/**
 * Couche service : contient les RÈGLES MÉTIER.
 * Les controllers ne doivent JAMAIS parler directement au repository :
 * ça garde toute la logique testable indépendamment du framework HTTP.
 */

function getAllProjects() {
  return projectRepository.findAll();
}

function getProjectById(id) {
  const project = projectRepository.findById(id);
  if (!project) {
    throw new AppError(`Aucun projet trouvé avec l'id ${id}`, 404);
  }
  return project;
}

function createProject(data) {
  return projectRepository.create(data);
}

function updateProject(id, updates) {
  const project = projectRepository.update(id, updates);
  if (!project) {
    throw new AppError(`Aucun projet trouvé avec l'id ${id}`, 404);
  }
  return project;
}

function deleteProject(id, { force = false } = {}) {
  // Règle métier : on refuse de supprimer un projet qui contient des tâches,
  // sauf si le client force explicitement l'opération (?force=true).
  const taskCount = taskRepository.countByProject(id);
  if (taskCount > 0 && !force) {
    throw new AppError(
      `Impossible de supprimer le projet ${id} : il contient ${taskCount} tâche(s). `
      + 'Ajoutez ?force=true pour forcer la suppression.',
      409,
    );
  }

  const deleted = projectRepository.remove(id);
  if (!deleted) {
    throw new AppError(`Aucun projet trouvé avec l'id ${id}`, 404);
  }
}

module.exports = {
  getAllProjects, getProjectById, createProject, updateProject, deleteProject,
};
