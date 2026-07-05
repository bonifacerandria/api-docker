const projectService = require('../services/projectService');

async function getAll(req, res, next) {
  try {
    const projects = await projectService.getAllProjects();
    res.status(200).json({ status: 'success', results: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const project = await projectService.getProjectById(parseInt(req.params.id, 10));
    res.status(200).json({ status: 'success', data: project });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const project = await projectService.createProject(req.body);
    res.status(201).json({ status: 'success', data: project });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectService.updateProject(parseInt(req.params.id, 10), req.body);
    res.status(200).json({ status: 'success', data: project });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const force = req.query.force === 'true';
    await projectService.deleteProject(parseInt(req.params.id, 10), { force });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll, getOne, create, update, remove,
};
