const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      error: Object.values(err.errors)
        .map((item) => item.message)
        .join(", ")
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: `Invalid ${err.path}`
    });
  }

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      message: `${duplicateField} already exists`
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: statusCode >= 500 ? "Internal server error" : err.message,
    error: err.message
  });
};

module.exports = errorMiddleware;
