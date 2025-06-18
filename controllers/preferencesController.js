/* eslint-disable no-undef */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getPreferences = async (req, res) => {
  try {
    const accountId = req.user.userId;
    const pref = await prisma.preference.findFirst({ where: { accountId } });
    if (!pref) return res.json({ topics: [], languages: [] });
    res.json({ topics: pref.topics, languages: pref.languages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get preferences.' });
  }
};

exports.savePreferences = async (req, res) => {
  try {
    const accountId = req.user.userId;
    const { topics, languages } = req.body;
    if (!Array.isArray(topics) || !Array.isArray(languages)) {
      return res.status(400).json({ error: 'Topics and languages must be arrays.' });
    }
    let pref = await prisma.preference.findFirst({ where: { accountId } });
    if (pref) {
      pref = await prisma.preference.update({
        where: { id: pref.id },
        data: { topics, languages },
      });
    } else {
      pref = await prisma.preference.create({
        data: { accountId, topics, languages },
      });
    }
    res.json({ topics: pref.topics, languages: pref.languages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save preferences.' });
  }
}; 