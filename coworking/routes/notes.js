const express = require('express');
const c = require('../controllers/notes');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const router = express.Router({ mergeParams: true });
router.use(protect);
router.route('/').get(asyncHandler(c.getNotes)).post(asyncHandler(c.addNote));
router.route('/:id').get(asyncHandler(c.getNote)).put(asyncHandler(c.updateNote)).delete(asyncHandler(c.deleteNote));
module.exports = router;
