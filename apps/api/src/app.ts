import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/error-handler';

import authRoutes from './routes/auth.routes';
import listingsRoutes from './routes/listings.routes';
import modelsRoutes from './routes/models.routes';
import pricesRoutes from './routes/prices.routes';
import suppliersRoutes from './routes/suppliers.routes';
import profitRoutes from './routes/profit.routes';
import analyticsRoutes from './routes/analytics.routes';
import dealsRoutes from './routes/deals.routes';
import chatRoutes from './routes/chat.routes';
import alertsRoutes from './routes/alerts.routes';
import aiRoutes from './routes/ai.routes';
import retailPricesRoutes from './routes/retail-prices.routes';

const app = express();

// Security
app.use(helmet());
const allowedOrigins = (() => {
  const origins: string[] = [];
  if (process.env.FRONTEND_URL) {
    origins.push(
      ...process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
    );
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173');
  }
  return origins;
})();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow Chrome extensions
      if (origin.startsWith('chrome-extension://')) return callback(null, true);
      // Allow configured origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Logging
app.use(morgan('short'));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisicoes. Tente novamente em 1 minuto.' },
});
app.use('/api', generalLimiter);

// Rate limiting - auth (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de autenticacao. Tente novamente em 1 minuto.' },
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/profit', profitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/retail-prices', retailPricesRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Rota nao encontrada' });
});

// Global error handler
app.use(errorHandler);

export default app;
