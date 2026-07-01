const Joi = require('joi');

const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid('active', 'archived').optional(),
}).min(1);

module.exports = { createProjectSchema, updateProjectSchema };
