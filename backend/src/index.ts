import express from 'express';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { requestLogger, logger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route imports
import aiRoutes from './routes/ai';
import coursesRoutes from './routes/courses';
import lecturesRoutes from './routes/lectures';
import notesRoutes from './routes/notes';
import flashcardsRoutes from './routes/flashcards';
import quizzesRoutes from './routes/quizzes';
import quotaRoutes from './routes/quota';
import paymentsRoutes from './routes/payments';
import cardsRoutes from './routes/cards';
import avatarRoutes from './routes/avatar';
import paystackWebhook from './routes/webhooks/paystack';
import muxWebhook from './routes/webhooks/mux';
import adminProvidersRoutes from './routes/admin/providers';
import adminUsersRoutes from './routes/admin/users';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import wellbeingRoutes from './routes/wellbeing';
import cronRoutes from './routes/cron';
import searchRoutes from './routes/search';
import pastPapersRoutes from './routes/past-papers';
import translateRoutes from './routes/translate';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

// Global Middlewares
app.use(corsMiddleware);
app.use(requestLogger);

// Webhooks (need raw body for signature verification before parsing JSON)
app.use('/api/webhooks/paystack', express.raw({ type: 'application/json' }), paystackWebhook);
app.use('/api/webhooks/mux', express.raw({ type: 'application/json' }), muxWebhook);

// Body Parser for all other routes
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/lectures', lecturesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/past-papers', pastPapersRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/users/me', avatarRoutes);

// Admin API Routes
app.use('/api/admin/providers', adminProvidersRoutes);
app.use('/api/admin/users', adminUsersRoutes); // Existing old routes
app.use('/api/admin', adminRoutes); // New unified router
app.use('/api/settings', settingsRoutes);
app.use('/api/translate', translateRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = env.PORT || 8000;
app.listen(PORT, () => {
  logger.info(`Backend server is running on port ${PORT} in ${env.NODE_ENV} mode.`);
});
