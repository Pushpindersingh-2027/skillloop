const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { timeAgo, shortName } = require('../utils/postHelpers');

const PER_PAGE = 5;

exports.listPosts = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const type = (req.query.type || '').trim();
    const skill = (req.query.skill || '').trim();
    const mine = req.query.mine === '1';
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const query = {
      status: { $ne: 'deleted' },
    };

    if (mine) query.author = req.user.id;
    if (type) query.type = type;

    if (skill) {
      query.skills = {
        $regex: new RegExp('^' + skill + '$', 'i'),
      };
    }

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { skills: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Post.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const raw = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .populate('author', 'firstName lastName accountStatus')
      .lean();

    const posts = raw.map((post) => ({
      ...post,
      timeAgo: timeAgo(post.createdAt),
      authorName: shortName(post.author),
      isMine: post.author && post.author._id.toString() === req.user.id,
    }));

    const skillAgg = await Post.aggregate([
      { $match: { status: 'open' } },
      { $unwind: '$skills' },
      {
        $group: {
          _id: { $toLower: '$skills' },
          n: { $sum: 1 },
          display: { $first: '$skills' },
        },
      },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 8 },
    ]);

    const topSkills = skillAgg.map((item) => item.display);

    res.render('posts/list', {
      posts,
      q,
      type,
      skill,
      mine,
      page,
      totalPages,
      total,
      topSkills,
    });
  } catch (err) {
    console.error('Posts list error:', err);

    res.status(500).json({
      error: 'Failed to load posts',
    });
  }
};

exports.showCreateForm = (req, res) => {
  res.render('posts/create', {
    error: null,
  });
};

exports.createPost = async (req, res) => {
  try {
    const { type, title, description, skills, availability } = req.body;

    const trimmedTitle = (title || '').trim();
    const trimmedDescription = (description || '').trim();

    if (!type || !trimmedTitle || !trimmedDescription) {
      return res.render('posts/create', {
        error: 'Type, title and description are required.',
      });
    }

    if (trimmedTitle.length > 100) {
      return res.render('posts/create', {
        error: 'Title must be 100 characters or fewer.',
      });
    }

    if (trimmedDescription.length > 2000) {
      return res.render('posts/create', {
        error: 'Description must be 2000 characters or fewer.',
      });
    }

    const existing = await Post.findOne({
      author: req.user.id,
      title: trimmedTitle,
      status: { $ne: 'deleted' },
    });

    if (existing) {
      return res.render('posts/create', {
        error: 'You already have a post with this title.',
      });
    }

    const skillsArray = skills
      ? skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    await Post.create({
      type,
      title: trimmedTitle,
      description: trimmedDescription,
      skills: skillsArray,
      availability: availability || '',
      author: req.user.id,
    });

    res.redirect('/posts?mine=1');
  } catch (err) {
    console.error('Create post error:', err);

    res.render('posts/create', {
      error: 'Failed to create post.',
    });
  }
};

exports.showEditForm = (req, res) => {
  res.render('posts/edit', {
    post: req.post,
    error: null,
  });
};

exports.updatePost = async (req, res) => {
  const { type, title, description, skills, availability } = req.body;

  try {
    const trimmedTitle = (title || '').trim();
    const trimmedDescription = (description || '').trim();

    const renderError = (error) =>
      res.render('posts/edit', {
        post: {
          ...req.post,
          type,
          title,
          description,
          skills: (skills || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          availability,
        },
        error,
      });

    if (!type || !trimmedTitle || !trimmedDescription) {
      return renderError('Type, title and description are required.');
    }

    if (trimmedTitle.length > 100) {
      return renderError('Title must be 100 characters or fewer.');
    }

    if (trimmedDescription.length > 2000) {
      return renderError('Description must be 2000 characters or fewer.');
    }

    const existing = await Post.findOne({
      _id: { $ne: req.post._id },
      author: req.user.id,
      title: trimmedTitle,
      status: { $ne: 'deleted' },
    });

    if (existing) {
      return renderError('You already have a post with this title.');
    }

    await Post.findByIdAndUpdate(req.post._id, {
      type,
      title: trimmedTitle,
      description: trimmedDescription,
      skills: skills
        ? skills
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      availability: availability || '',
    });

    res.redirect('/posts?mine=1');
  } catch (err) {
    console.error('Edit save error:', err);
    res.redirect('/posts?mine=1');
  }
};

exports.deletePost = async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.post._id, {
      status: 'deleted',
    });

    res.redirect(req.get('referer') || '/posts');
  } catch (err) {
    console.error('Delete post error:', err);
    res.redirect('/posts');
  }
};

exports.resolvePost = async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.post._id, {
      status: 'resolved',
    });

    res.redirect(req.get('referer') || '/posts');
  } catch (err) {
    console.error('Resolve post error:', err);
    res.redirect('/posts');
  }
};

exports.showPostDetails = async (req, res, next) => {
  try {
    const raw = await Post.findOne({
      _id: req.params.id,
      status: { $ne: 'deleted' },
    })
      .populate('author', 'firstName lastName school rating avatar accountStatus')
      .lean();

    if (!raw) {
      return res.redirect('/browse');
    }

    const authorSafe =
      raw.author && raw.author.accountStatus === 'deleted'
        ? { ...raw.author, avatar: null }
        : raw.author;

    const post = {
      ...raw,
      author: authorSafe,
      timeAgo: timeAgo(raw.createdAt),
      authorName: shortName(authorSafe),
    };

    const isOwner = raw.author && raw.author._id.toString() === req.user.id;

    const all = await Comment.find({
      post: raw._id,
      status: 'active',
    })
      .sort({ createdAt: 1 })
      .populate('author', 'firstName lastName accountStatus')
      .lean();

    const decorate = (comment) => ({
      ...comment,
      timeAgo: timeAgo(comment.createdAt),
      authorName: shortName(comment.author),
      isMine: comment.author && comment.author._id.toString() === req.user.id,
    });

    const tops = all
      .filter((comment) => !comment.parent)
      .map((comment) => ({
        ...decorate(comment),
        replies: [],
      }));

    const byId = {};

    tops.forEach((comment) => {
      byId[comment._id.toString()] = comment;
    });

    all
      .filter((comment) => comment.parent)
      .forEach((reply) => {
        const parent = byId[reply.parent.toString()];

        if (parent) {
          parent.replies.push(decorate(reply));
        }
      });

    res.render('posts/detail', {
      post,
      isOwner,
      comments: tops,
      commentCount: all.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const body = (req.body.body || '').trim();
    const parent = req.body.parent || null;

    if (body) {
      const post = await Post.findOne({
        _id: req.params.id,
        status: { $ne: 'deleted' },
      }).lean();

      if (post) {
        await Comment.create({
          post: post._id,
          author: req.user.id,
          body,
          parent: parent || null,
        });
      }
    }

    res.redirect('/posts/' + req.params.id);
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      {
        _id: req.params.cid,
        author: req.user.id,
      },
      {
        status: 'deleted',
      }
    ).lean();

    res.redirect(comment ? '/posts/' + comment.post : '/browse');
  } catch (err) {
    next(err);
  }
};
