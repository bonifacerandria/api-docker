const express = require('express');
const projectController = require('../controllers/projectController');
const validate = require('../middlewares/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidator');

const router = express.Router();

router.get('/', projectController.getAll);
router.get('/:id', projectController.getOne);
router.post('/', validate(createProjectSchema), projectController.create);
router.patch('/:id', validate(updateProjectSchema), projectController.update);
router.delete('/:id', projectController.remove);

module.exports = router;
