const express = require('express');
const taskController = require('../controllers/taskController');
const validate = require('../middlewares/validate');
const {
  createTaskSchema, updateTaskSchema, updateStatusSchema,
} = require('../validators/taskValidator');

const router = express.Router();

router.get('/', taskController.getAll);
router.get('/:id', taskController.getOne);
router.post('/', validate(createTaskSchema), taskController.create);
router.patch('/:id', validate(updateTaskSchema), taskController.update);
router.patch('/:id/status', validate(updateStatusSchema), taskController.updateStatus);
router.delete('/:id', taskController.remove);

module.exports = router;
