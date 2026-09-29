const express = require('express');

const router = express.Router();

const postController = require('../controllers/postController');
const { requirePostOwner } = require('../middleware/postOwnership');

// Post listing and creation
router.get('/', postController.listPosts);
router.get('/create', postController.showCreateForm);
router.post('/create', postController.createPost);

// Owner-only post operations
router.get('/:id/edit', requirePostOwner, postController.showEditForm);

router.post('/:id/edit', requirePostOwner, postController.updatePost);

router.post('/:id/delete', requirePostOwner, postController.deletePost);

router.post('/:id/resolve', requirePostOwner, postController.resolvePost);

// Comments
router.post('/comments/:cid/delete', postController.deleteComment);

router.post('/:id/comments', postController.addComment);

// Dynamic post detail route must remain last
router.get('/:id', postController.showPostDetails);

module.exports = router;
