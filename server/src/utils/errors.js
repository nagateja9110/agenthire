class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

class RetryableError extends Error {
  constructor(code, message, cause = undefined) {
    super(message);
    this.code = code;
    this.retryable = true;
    this.cause = cause;
  }
}

class NonRetryableError extends Error {
  constructor(code, message, cause = undefined) {
    super(message);
    this.code = code;
    this.retryable = false;
    this.cause = cause;
  }
}

module.exports = { ApiError, RetryableError, NonRetryableError };
