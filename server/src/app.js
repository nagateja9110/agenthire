const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const env = require('./config/env');
const routes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimiters');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(mongoSanitize());
  app.use(globalLimiter);

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
