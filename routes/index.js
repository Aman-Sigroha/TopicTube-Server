const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/preferences', require('./preferences'));
router.use('/progress', require('./progress'));

module.exports = router; 