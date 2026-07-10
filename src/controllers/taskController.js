const taskService = require('../services/taskService');

function getAll(req, res, next) {
  try {
    const filters = {
      projectId: req.query.projectId ? parseInt(req.query.projectId, 10) : undefined,
      status: req.query.status,
      priority: req.query.priority,
    };
    const tasks = taskService.getAllTasks(filters);
    res.status(200).json({ status: 'success', results: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const task = taskService.getTaskById(parseInt(req.params.id, 10));
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const task = taskService.createTask(req.body);
    res.status(201).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function updateStatus(req, res, next) {
  try {
    const task = taskService.updateTaskStatus(parseInt(req.params.id, 10), req.body.status);
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const task = taskService.updateTask(parseInt(req.params.id, 10), req.body);
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    taskService.deleteTask(parseInt(req.params.id, 10));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll, getOne, create, updateStatus, update, remove,
};
