/**
 * Repository en mémoire pour les tâches. Même logique que projectRepository :
 * sera remplacé par PostgreSQL au module 5 sans casser le reste de l'app.
 */

let tasks = [];
let nextId = 1;

function findAll(filters = {}) {
  let result = tasks;
  if (filters.projectId) {
    result = result.filter((t) => t.projectId === filters.projectId);
  }
  if (filters.status) {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters.priority) {
    result = result.filter((t) => t.priority === filters.priority);
  }
  return result;
}

function findById(id) {
  return tasks.find((t) => t.id === id) || null;
}

function create({ projectId, title, description, priority, dueDate }) {
  const task = {
    id: nextId++,
    projectId,
    title,
    description: description || '',
    status: 'todo',
    priority: priority || 'medium',
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

function update(id, updates) {
  const task = findById(id);
  if (!task) return null;
  Object.assign(task, updates, { updatedAt: new Date().toISOString() });
  return task;
}

function remove(id) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

function countByProject(projectId) {
  return tasks.filter((t) => t.projectId === projectId).length;
}

function _reset() {
  tasks = [];
  nextId = 1;
}

module.exports = {
  findAll, findById, create, update, remove, countByProject, _reset,
};
