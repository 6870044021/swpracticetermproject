const mongoose = require('mongoose');
const Review = require('../models/Review');
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const { DEFAULT_RESERVATION_DURATION_MS } = require('../utils/time');
const { sendError } = require('../utils/errors');

const ROOM_FIELDS = { path: 'room', select: 'name description address tel openCloseTimes' };
const REVIEWER_FIELDS = { path: 'user', select: 'name' };

const isAdmin = (req) => req.user.role === 'admin';
const isTrue = (value) => value === true || (typeof value === 'string' && ['true', '1', 'yes'].includes(value.toLowerCase()));
const isBooleanLike = (value) => typeof value === 'boolean' || (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase()));
const idOf = (value) => (value && value._id ? value._id.toString() : value ? value.toString() : null);

// A5: number of past bookings (reservations that have already ended) of each reviewer, in total and per room.
const countPastBookings = async (userIds) => {
    const stats = new Map();
    if (!userIds.length) {
        return stats;
    }
    const rows = await Reservation.aggregate([
        { $match: { user: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
        { $addFields: { effectiveEnd: { $ifNull: ['$endDate', { $add: ['$reservationDate', DEFAULT_RESERVATION_DURATION_MS] }] } } },
        { $match: { effectiveEnd: { $lte: new Date() } } },
        { $group: { _id: { user: '$user', room: '$room' }, count: { $sum: 1 } } }
    ]);
    for (const row of rows) {
        const userId = row._id.user.toString();
        const entry = stats.get(userId) || { total: 0, byRoom: new Map() };
        entry.total += row.count;
        entry.byRoom.set(row._id.room.toString(), row.count);
        stats.set(userId, entry);
    }
    return stats;
};

// A12: an anonymous review hides who wrote it from everyone except its author and admins.
const shapeReview = (review, req, stats) => {
    const reviewerId = idOf(review.user);
    const mine = reviewerId === req.user.id;
    const canSeeIdentity = !review.anonymousReview || mine || isAdmin(req);
    const userStats = stats.get(reviewerId) || { total: 0, byRoom: new Map() };

    return {
        _id: review._id,
        room: review.room,
        reviewData: review.reviewData,
        anonymousReview: Boolean(review.anonymousReview),
        user: canSeeIdentity ? reviewerId : null,
        reviewerName: review.anonymousReview ? 'Anonymous' : (review.user && review.user.name) || 'Unknown user',
        pastBookings: userStats.total,
        pastBookingsInThisRoom: userStats.byRoom.get(idOf(review.room)) || 0,
        isMine: mine,
        createdAt: review.createdAt
    };
};

const shapeReviews = async (reviews, req) => {
    const userIds = [...new Set(reviews.map((r) => idOf(r.user)).filter(Boolean))];
    const stats = await countPastBookings(userIds);
    return reviews.map((review) => shapeReview(review, req, stats));
};

const findShapedReview = async (id, req) => {
    const review = await Review.findById(id).populate(ROOM_FIELDS).populate(REVIEWER_FIELDS).lean();
    return review ? (await shapeReviews([review], req))[0] : null;
};

//@desc     Get reviews (A5 credibility, A12 anonymous, A13 ?excludeAnonymous=true filters anonymous reviews out)
//@route    GET /api/v1/reviews
//@route    GET /api/v1/rooms/:roomId/reviews
//@access   Private
exports.getReviews = async (req, res, next) => {
    try {
        const filter = {};
        if (req.params.roomId) {
            const room = await Room.findById(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: `No room with the id of ${req.params.roomId}` });
            }
            filter.room = room._id;
        }

        if (isTrue(req.query.excludeAnonymous)) {
            filter.anonymousReview = { $ne: true };
        }

        const reviews = await Review.find(filter)
            .populate(ROOM_FIELDS)
            .populate(REVIEWER_FIELDS)
            .sort('-createdAt')
            .lean();
        const data = await shapeReviews(reviews, req);

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        return sendError(res, err, 'Cannot find reviews');
    }
};

//@desc     Get single review
//@route    GET /api/v1/reviews/:id
//@access   Private
exports.getReview = async (req, res, next) => {
    try {
        const review = await findShapedReview(req.params.id, req);
        if (!review) {
            return res.status(404).json({ success: false, message: `No review with the id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: review });
    } catch (err) {
        return sendError(res, err, 'Cannot find review');
    }
};

//@desc     Add review (A5, A10 only 1 review per room, A11 via checkStatus, A12 optional anonymousReview)
//@route    POST /api/v1/rooms/:roomId/reviews   body: { reviewData, anonymousReview }
//@access   Private
exports.addReview = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: `No room with the id of ${req.params.roomId}` });
        }

        const { reviewData, anonymousReview } = req.body;
        if (anonymousReview !== undefined && !isBooleanLike(anonymousReview)) {
            return res.status(400).json({ success: false, message: 'anonymousReview must be true or false' });
        }

        //A10: one review per user per room
        const existedReview = await Review.findOne({ user: req.user.id, room: room._id });
        if (existedReview) {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made a review for room ${room._id}. Please delete the old review first or edit it instead.`
            });
        }

        //The user always comes from the token and the room from the URL
        const review = await Review.create({
            reviewData,
            anonymousReview: isTrue(anonymousReview),
            user: req.user.id,
            room: room._id
        });

        res.status(201).json({ success: true, data: await findShapedReview(review._id, req) });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made a review for room ${req.params.roomId}. Please delete the old review first or edit it instead.`
            });
        }
        return sendError(res, err, 'Cannot create review');
    }
};

//@desc     Update review (only reviewData and anonymousReview can change)
//@route    PUT /api/v1/reviews/:id
//@access   Private (author or admin)
exports.updateReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: `No review with the id of ${req.params.id}` });
        }

        //Ownership: make sure user is the review author or admin
        if (review.user.toString() !== req.user.id && !isAdmin(req)) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this review` });
        }

        const { reviewData, anonymousReview } = req.body;
        if (reviewData === undefined && anonymousReview === undefined) {
            return res.status(400).json({ success: false, message: 'Nothing to update. You can change reviewData and anonymousReview' });
        }
        if (anonymousReview !== undefined && !isBooleanLike(anonymousReview)) {
            return res.status(400).json({ success: false, message: 'anonymousReview must be true or false' });
        }

        if (reviewData !== undefined) {
            review.reviewData = reviewData;
        }
        if (anonymousReview !== undefined) {
            review.anonymousReview = isTrue(anonymousReview);
        }
        await review.save({ validateModifiedOnly: true });

        res.status(200).json({ success: true, data: await findShapedReview(review._id, req) });
    } catch (err) {
        return sendError(res, err, 'Cannot update review');
    }
};

//@desc     Delete review (A10: delete the old review to write a new one for the same room)
//@route    DELETE /api/v1/reviews/:id
//@access   Private (author or admin)
exports.deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: `No review with the id of ${req.params.id}` });
        }

        if (review.user.toString() !== req.user.id && !isAdmin(req)) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this review` });
        }

        await review.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        return sendError(res, err, 'Cannot delete review');
    }
};
