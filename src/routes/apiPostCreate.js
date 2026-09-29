const express = require('express');

const router = express.Router();
const Post = require('../models/Post');

// POST /api/posts
router.post('/', async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      skills,
      availability
    } = req.body;

    if (!type || !title || !description) {
      return res.status(400).send(
        'Type, title and description are required.'
      );
    }

    const skillsArray = skills
      ? skills.split(',').map(skill => skill.trim()).filter(Boolean)
      : [];

    await Post.create({
      type,
      title: title.trim(),
      description: description.trim(),
      skills: skillsArray,
      availability: availability || '',
      author: req.user.id
    });

    return res.redirect('/posts?mine=1');

  } catch (error) {
    console.error(error);

    res.status(500).send('Failed to create post');
  }
});

module.exports = router;