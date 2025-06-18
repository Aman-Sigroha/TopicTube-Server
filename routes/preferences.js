const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const preferencesController = require('../controllers/preferencesController');

router.get('/', auth, preferencesController.getPreferences);
router.post('/', auth, preferencesController.savePreferences);

module.exports = router; 