/* eslint-disable no-undef */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const progress = await prisma.progress.findMany({ where: { userId } });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get progress.' });
  }
};

exports.saveProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, videoId, status } = req.body;
    if (!topic || !videoId || !status) {
      return res.status(400).json({ error: 'topic, videoId, and status are required.' });
    }
    // Upsert: update if exists, else create
    const existing = await prisma.progress.findFirst({ where: { userId, topic, videoId } });
    let progress;
    if (existing) {
      progress = await prisma.progress.update({
        where: { id: existing.id },
        data: { status },
      });
    } else {
      progress = await prisma.progress.create({
        data: { userId, topic, videoId, status },
      });
    }
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save progress.' });
  }
}; 