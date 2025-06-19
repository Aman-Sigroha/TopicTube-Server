const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),
  ],
  authController.register
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  authController.login
);

// Refresh token
router.post('/refresh', authController.refresh);

// Logout
router.post('/logout', authController.logout);

// Google login
router.post('/google', authController.googleLogin);

module.exports = router; 