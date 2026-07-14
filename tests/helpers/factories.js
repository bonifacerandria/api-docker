/**
 * Factories : construisent des objets valides par défaut, avec possibilité
 * de surcharger uniquement les champs pertinents pour un test donné.
 * Évite de dupliquer des objets littéraux dans chaque fichier de test et
 * rend l'intention de chaque test plus lisible (on ne voit que ce qui compte).
 */

function buildProjectPayload(overrides = {}) {
  return {
    name: 'Projet de test',
    description: 'Description de test',
    ...overrides,
  };
}

function buildTaskPayload(projectId, overrides = {}) {
  return {
    projectId,
    title: 'Tâche de test',
    description: 'Description de test',
    priority: 'medium',
    ...overrides,
  };
}

module.exports = { buildProjectPayload, buildTaskPayload };
