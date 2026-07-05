const taskService = require('../services/taskService');

async function getAll(req, res, next) {
  try {
    const filters = {
      projectId: req.query.projectId ? parseInt(req.query.projectId, 10) : undefined,
      status: req.query.status,
      priority: req.query.priority,
    };
    const tasks = await taskService.getAllTasks(filters);
    res.status(200).json({ status: 'success', results: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const task = await taskService.getTaskById(parseInt(req.params.id, 10));
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const task = await taskService.updateTaskStatus(parseInt(req.params.id, 10), req.body.status);
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const task = await taskService.updateTask(parseInt(req.params.id, 10), req.body);
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await taskService.deleteTask(parseInt(req.params.id, 10));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll, getOne, create, updateStatus, update, remove,
};
