// Maps Mongoose/MongoDB errors to an HTTP status and a readable message, so every controller
// answers with JSON { success:false, message } instead of crashing or returning HTML.
const describeError = (err, fallbackMessage) => {
    if (err && err.name === 'ValidationError') {
        return { status: 400, message: Object.values(err.errors).map((e) => e.message).join(', ') };
    }
    if (err && err.name === 'CastError') {
        const value = typeof err.value === 'string' ? err.value : JSON.stringify(err.value);
        return { status: 400, message: `Invalid ${err.path}: ${value}` };
    }
    if (err && err.code === 11000) {
        const fields = Object.keys(err.keyValue || err.keyPattern || {}).join(', ') || 'a unique field';
        return { status: 400, message: `Duplicate value for ${fields}` };
    }
    return { status: 500, message: fallbackMessage };
};

const sendError = (res, err, fallbackMessage) => {
    const { status, message } = describeError(err, fallbackMessage);
    if (status === 500) {
        console.log(err);
    }
    return res.status(status).json({ success: false, message });
};

module.exports = { describeError, sendError };
