const express = require('express');
const c = require('../controllers/reviews');
const { protect, checkStatus } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const router = express.Router({ mergeParams: true });
router.use(protect);
router.route('/').get(asyncHandler(c.getReviews)).post(checkStatus, asyncHandler(c.addReview));
router.route('/:id').get(asyncHandler(c.getReview)).put(checkStatus, asyncHandler(c.updateReview)).delete(asyncHandler(c.deleteReview));
module.exports = router;
