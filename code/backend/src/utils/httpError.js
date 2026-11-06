// HTTP status kodi bilan xato. Service'lar shuni throw qiladi, middleware esa javobga aylantiradi.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = HttpError;
