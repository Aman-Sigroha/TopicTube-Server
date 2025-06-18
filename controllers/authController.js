/* eslint-disable no-undef */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const SALT_ROUNDS = 10;
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function setRefreshTokenCookie(res, token) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
}

exports.register = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists.' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const refreshToken = generateRefreshToken();
    const user = await prisma.user.create({
      data: { email, password: hash, refreshToken },
    });
    setRefreshTokenCookie(res, refreshToken);
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
};

exports.login = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Account lockout check
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(403).json({ error: `Account locked. Try again after ${new Date(user.lockUntil).toLocaleTimeString()}` });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Increment failedAttempts and lock if needed
      let failedAttempts = user.failedAttempts + 1;
      let lockUntil = null;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
        failedAttempts = 0; // reset after lock
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts, lockUntil },
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Reset failedAttempts and lockUntil on success
    const refreshToken = generateRefreshToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockUntil: null, refreshToken },
    });
    setRefreshTokenCookie(res, refreshToken);
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];
    if (!token) return res.status(401).json({ error: 'No refresh token.' });
    const user = await prisma.user.findFirst({ where: { refreshToken: token } });
    if (!user) return res.status(401).json({ error: 'Invalid refresh token.' });
    // Issue new access token
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: accessToken });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh token.' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];
    if (token) {
      await prisma.user.updateMany({ where: { refreshToken: token }, data: { refreshToken: null } });
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logged out.' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed.' });
  }
}; 