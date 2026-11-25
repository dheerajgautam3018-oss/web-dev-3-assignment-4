const mongoose = require('mongoose');

const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error(`Invalid Product ID format: ${req.params.id}`);
    error.statusCode = 400;
    return next(error);
  }
  next();
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with invalid ID: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value entered for '${field}': ${err.keyValue[field]}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Input Validation Failed';
    details = Object.values(err.errors).map((val) => val.message);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details })
  });
};

module.exports = { validateObjectId, errorHandler };
