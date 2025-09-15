/**
 * Configuration Manager
 * إدارة إعدادات النظام
 */

import dotenv from 'dotenv';

dotenv.config();

export class Config {
  constructor() {
    this.djangoBaseUrl = process.env.DJANGO_BASE_URL || 'https://stockly.encryptosystem.com';
    this.apiToken = process.env.API_TOKEN;
    this.serverPort = parseInt(process.env.MCP_SERVER_PORT) || 3001;
    this.serverHost = process.env.MCP_SERVER_HOST || '0.0.0.0';
    this.nodeEnv = process.env.NODE_ENV || 'development';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFile = process.env.LOG_FILE || 'logs/mcp-server.log';
    this.corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5678';
    this.rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutes
    this.rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000; // 30 seconds
    this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10;
    this.cacheTtl = parseInt(process.env.CACHE_TTL) || 300000; // 5 minutes
    this.healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
    this.healthCheckTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000; // 5 seconds
  }

  validate() {
    const errors = [];

    if (!this.apiToken) {
      errors.push('API_TOKEN is required');
    }

    if (!this.djangoBaseUrl) {
      errors.push('DJANGO_BASE_URL is required');
    }

    if (this.apiToken === 'your_django_api_token_here') {
      errors.push('Please set a valid API_TOKEN in .env file');
    }

    if (errors.length > 0) {
      console.error('❌ Configuration errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }

    return true;
  }

  getHeaders() {
    return {
      'Authorization': `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Stockly-MCP-Server/1.0.0',
    };
  }

  isDevelopment() {
    return this.nodeEnv === 'development';
  }

  isProduction() {
    return this.nodeEnv === 'production';
  }
}
