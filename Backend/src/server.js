const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');

const PORT = env.PORT || 3000;

async function startServer() {
  try {
    console.log('[SERVER] Authenticating database connection...');
    await sequelize.authenticate();
    console.log('[SERVER] Database connection established successfully.');

    const server = app.listen(PORT, () => {
      console.log(`[SERVER] Product Catalogue Backend running on http://localhost:${PORT}`);
      console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
      console.log(`[SERVER] Swagger Docs: http://localhost:${PORT}/api-docs`);
      console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
      console.log(`[SERVER] Products API: http://localhost:${PORT}/api/products`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[SERVER] Received ${signal}. Closing server and database connection gracefully...`);
      server.close(async () => {
        try {
          await sequelize.close();
          console.log('[SERVER] Database connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('[SERVER] Error while closing database connection:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
