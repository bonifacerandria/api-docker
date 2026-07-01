const projectService = require('../services/projectService');

/**
 * Couche controller : traduit HTTP <-> appels au service.
 * Aucune logique métier ici, juste du "câblage" requête/réponse.
 * `next(err)` transmet toute erreur au middleware errorHandler global.
 */

function getAll(req, res, next) {
  try {
    const projects = projectService.getAllProjects();
    res.status(200).json({ status: 'success', results: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const project = projectService.getProjectById(parseInt(req.params.id, 10));
    res.status(200).json({ status: 'success', data: project });
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const project = projectService.createProject(req.body);
    res.status(201).json({ status: 'success', data: project });
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const project = projectService.updateProject(parseInt(req.params.id, 10), req.body);
    res.status(200).json({ status: 'success', data: project });
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const force = req.query.force === 'true';
    projectService.deleteProject(parseInt(req.params.id, 10), { force });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll, getOne, create, update, remove,
};
