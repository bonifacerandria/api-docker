const taskRepository = require('../repositories/taskRepository');
const projectRepository = require('../repositories/projectRepository');
const AppError = require('../utils/AppError');

const ALLOWED_TRANSITIONS = {
  todo: ['in_progress'],
  in_progress: ['done', 'todo'],
  done: ['in_progress'],
};

async function getAllTasks(filters) {
  return taskRepository.findAll(filters);
}

async function getTaskById(id) {
  const task = await taskRepository.findById(id);
  if (!task) {
    throw new AppError(`Aucune tâche trouvée avec l'id ${id}`, 404);
  }
  return task;
}

async function createTask(data) {
  const project = await projectRepository.findById(data.projectId);
  if (!project) {
    throw new AppError(`Impossible de créer la tâche : le projet ${data.projectId} n'existe pas`, 400);
  }
  return taskRepository.create(data);
}

async function updateTaskStatus(id, newStatus) {
  const task = await getTaskById(id);
  const allowed = ALLOWED_TRANSITIONS[task.status] || [];

  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Transition invalide : impossible de passer de "${task.status}" à "${newStatus}". `
      + `Transitions autorisées depuis "${task.status}" : ${allowed.join(', ') || 'aucune'}.`,
      400,
    );
  }

  return taskRepository.update(id, { status: newStatus });
}

async function updateTask(id, updates) {
  const task = await taskRepository.update(id, updates);
  if (!task) {
    throw new AppError(`Aucune tâche trouvée avec l'id ${id}`, 404);
  }
  return task;
}

async function deleteTask(id) {
  const deleted = await taskRepository.remove(id);
  if (!deleted) {
    throw new AppError(`Aucune tâche trouvée avec l'id ${id}`, 404);
  }
}

module.exports = {
  getAllTasks, getTaskById, createTask, updateTaskStatus, updateTask, deleteTask,
};
