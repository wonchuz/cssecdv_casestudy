const { auditLogger } = require("./winston-logger");

function requireAuth(req, res, next) {
  if (!req.session.user) {
    auditLogger.warn({ evt: "ACCESS_DENY", reason: "unauthenticated", url: req.originalUrl });
    return res.status(401).send("Authentication required.");
  }
  next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) {
      auditLogger.warn({ evt: "ACCESS_DENY", reason: "unauthenticated", url: req.originalUrl });
      return res.status(401).send("Authentication required.");
    }
    if (!roles.includes(user.role)) {
      auditLogger.warn({
        evt: "ACCESS_DENY",
        reason: "forbidden",
        url: req.originalUrl,
        by: user.username || user.email,
        role: user.role,
      });
      return res.status(403).send("Forbidden.");
    }
    next();
  };
}

module.exports = { requireAuth, allowRoles };
