const Joi = require('joi');

const createTaskSchema = Joi.object({
  projectId: Joi.number().integer().positive().required(),
  title: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(1000).allow('').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional(),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'done').required(),
});

module.exports = { createTaskSchema, updateTaskSchema, updateStatusSchema };
