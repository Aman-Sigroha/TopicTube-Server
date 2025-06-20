const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;

// POST /api/youtube/oauth/callback
exports.oauthCallback = async (req, res) => {
  const { code } = req.body;
  const userId = req.user?.userId;
  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or user not authenticated.' });
  }
  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        redirect_uri: YOUTUBE_REDIRECT_URI,
        grant_type: 'authorization_code',
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;
    // Store tokens in DB (extend your user/account model as needed)
    await prisma.account.update({
      where: { id: userId },
      data: {
        youtubeAccessToken: access_token,
        youtubeRefreshToken: refresh_token,
        youtubeTokenExpiry: new Date(Date.now() + expires_in * 1000),
        youtubeScope: scope,
      },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect YouTube.' });
  }
}; 