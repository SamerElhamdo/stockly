/**
 * Logger Utility
 * أداة السجلات
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Logger {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'stockly-mcp-server' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })
          )
        }),
        // File transport
        new winston.transports.File({
          filename: path.join(__dirname, '../../logs/error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../../logs/combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      ],
    });

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../logs');
    try {
      const fs = await import('fs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Could not create logs directory:', error.message);
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Arabic logging methods
  infoAr(message, meta = {}) {
    this.logger.info(`[AR] ${message}`, meta);
  }

  errorAr(message, meta = {}) {
    this.logger.error(`[AR] ${message}`, meta);
  }

  warnAr(message, meta = {}) {
    this.logger.warn(`[AR] ${message}`, meta);
  }

  debugAr(message, meta = {}) {
    this.logger.debug(`[AR] ${message}`, meta);
  }
}
