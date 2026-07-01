/**
 * Repository en mémoire pour les projets.
 *
 * ⚠️ Volontairement "naïf" pour le module 1 : toutes les données disparaissent
 * au redémarrage du process. Au module 5, on remplacera l'intérieur de ces
 * fonctions par de vraies requêtes SQL (PostgreSQL), SANS changer la signature
 * des fonctions -> les services et controllers n'auront rien à modifier.
 * C'est le principe du Repository Pattern.
 */

let projects = [];
let nextId = 1;

function findAll() {
  return projects;
}

function findById(id) {
  return projects.find((p) => p.id === id) || null;
}

function create({ name, description }) {
  const project = {
    id: nextId++,
    name,
    description: description || '',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  projects.push(project);
  return project;
}

function update(id, updates) {
  const project = findById(id);
  if (!project) return null;
  Object.assign(project, updates, { updatedAt: new Date().toISOString() });
  return project;
}

function remove(id) {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  projects.splice(index, 1);
  return true;
}

// Utilitaire réservé aux tests (module 7) pour repartir d'un état propre.
function _reset() {
  projects = [];
  nextId = 1;
}

module.exports = { findAll, findById, create, update, remove, _reset };
