import path from 'path';
import fs from 'fs';
import winston from 'winston';

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const LOG_FILE = path.join(logsDir, 'app.log');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const fileFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level.toUpperCase()}] ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), errors({ stack: true }), fileFormat),
  transports: [
    new winston.transports.File({ filename: LOG_FILE, maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), errors({ stack: true }), fileFormat)
    })
  ]
});
