const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logFmt = format.combine(format.timestamp(), format.json());

const auditLogger = createLogger({
  level: "info",
  format: logFmt,
  transports: [new transports.File({ filename: path.join(logsDir, "audit.log") })],
});

const errorLogger = createLogger({
  level: "error",
  format: logFmt,
  transports: [new transports.File({ filename: path.join(logsDir, "error.log") })],
});

function requestLogger(req, res, next) {
  const user = req.session?.user?.username || req.session?.user?.email || null;
  auditLogger.info({ evt: "REQ", method: req.method, url: req.originalUrl, user });
  next();
}

module.exports = { auditLogger, requestLogger, errorLogger };
