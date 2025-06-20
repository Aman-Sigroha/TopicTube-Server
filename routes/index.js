const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const auth = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/preferences', require('./preferences'));
router.use('/progress', require('./progress'));
router.post('/youtube/oauth/callback', auth, youtubeController.oauthCallback);

module.exports = router; 