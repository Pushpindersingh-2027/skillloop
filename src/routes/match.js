const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');

// how many candidate posts to consider / return
const CANDIDATE_LIMIT = 30;
const RESULT_LIMIT = 6;
const OPENAI_TIMEOUT_MS = 8000;

// Core matching logic — used by both the /api/match route and the dashboard page,
// so there's one source of truth instead of two separate queries.
async function getSuggestionsForUser(userId) {
  const user = await User.findById(userId).select('expertise').lean();
  const userSkills = (user && Array.isArray(user.expertise))
    ? user.expertise.map(e => e.skill).filter(Boolean)
    : [];

  const candidates = await Post.find({
    status: 'open',
    author: { $ne: userId },
  })
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .select('_id type title skills author')
    .populate('author', 'firstName lastName')
    .lean();

  if (!userSkills.length || !candidates.length) {
    return { suggestions: candidates.slice(0, RESULT_LIMIT), source: 'fallback', reason: 'no_data' };
  }

  // De-identified dataset — only skills/topics, no names/emails/ids beyond post id
  const dataset = {
    userSkills,
    posts: candidates.map(p => ({
      id: p._id.toString(),
      type: p.type,
      title: p.title,
      skills: p.skills || [],
    })),
  };

  let rankedIds;
  try {
    rankedIds = await getAiRankedIds(dataset);
  } catch (aiErr) {
    console.error('AI matching failed, falling back to recent posts:', aiErr.message);
    return { suggestions: candidates.slice(0, RESULT_LIMIT), source: 'fallback', reason: 'ai_unavailable' };
  }

  const byId = {};
  candidates.forEach(p => { byId[p._id.toString()] = p; });
  const ordered = rankedIds
    .map(id => byId[id])
    .filter(Boolean)
    .slice(0, RESULT_LIMIT);

  if (!ordered.length) {
    return { suggestions: candidates.slice(0, RESULT_LIMIT), source: 'fallback', reason: 'ai_empty_result' };
  }

  return { suggestions: ordered, source: 'ai' };
}

// Calls OpenAI with a timeout, asks for a ranked list of post ids.
async function getAiRankedIds(dataset) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You match students to relevant posts based on skill overlap. ' +
              'Respond ONLY with a JSON array of post id strings, ranked most relevant first. ' +
              'No preamble, no explanation, no markdown — just the JSON array.',
          },
          {
            role: 'user',
            content: JSON.stringify(dataset),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '[]';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error('AI response was not an array');
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

// GET /api/match — AI-suggested posts for the logged-in user (used for on-demand refresh, e.g. AJAX)
router.get('/match', async (req, res) => {
  try {
    const result = await getSuggestionsForUser(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Match route error:', err);
    res.status(500).json({ suggestions: [], source: 'error', error: 'Failed to load suggestions' });
  }
});

module.exports = router;
module.exports.getSuggestionsForUser = getSuggestionsForUser;