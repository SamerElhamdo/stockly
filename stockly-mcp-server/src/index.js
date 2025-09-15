#!/usr/bin/env node

/**
 * Stockly MCP Server - Main Entry Point
 * محاسب ذكي لنظام Stockly
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { StocklyMCPTools } from './tools/stockly-tools.js';
import { Logger } from './utils/logger.js';
import { Config } from './utils/config.js';

// Load environment variables
dotenv.config();

class StocklyMCPServer {
  constructor() {
    this.config = new Config();
    this.logger = new Logger();
    this.tools = new StocklyMCPTools(this.config, this.logger);
    this.server = new Server(
      {
        name: 'stockly-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.info('Listing available tools');
      return {
        tools: this.tools.getAvailableTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.logger.info(`Executing tool: ${name}`, { args });

      try {
        const result = await this.tools.executeTool(name, args);
        this.logger.info(`Tool ${name} executed successfully`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.logger.error(`Tool ${name} execution failed:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message,
                success: false,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    try {
      this.logger.info('Starting Stockly MCP Server...');
      
      // Validate configuration
      if (!this.config.validate()) {
        this.logger.error('Configuration validation failed');
        process.exit(1);
      }

      // Test connection to Django
      await this.tools.testConnection();
      this.logger.info('Django connection test successful');

      // Start server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.logger.info('Stockly MCP Server started successfully');
      this.logger.info(`Available tools: ${this.tools.getAvailableTools().length}`);
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Stockly MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Stockly MCP Server...');
  process.exit(0);
});

// Start the server
const server = new StocklyMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
