const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const progressController = require('../controllers/progressController');

router.get('/', auth, progressController.getProgress);
router.post('/', auth, progressController.saveProgress);

module.exports = router; 