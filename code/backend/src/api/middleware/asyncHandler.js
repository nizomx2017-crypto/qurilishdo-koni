// Express 4 async handler'dagi xatolarni o'zi ushlamaydi — shu wrapper ularni next(err) ga uzatadi
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
