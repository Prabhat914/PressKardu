const requireRole = (...roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have access to this resource" });
  }

  next();
};

module.exports = requireRole;
