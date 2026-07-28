"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const cors_1 = require("./middleware/cors");
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Route imports
const ai_1 = __importDefault(require("./routes/ai"));
const courses_1 = __importDefault(require("./routes/courses"));
const lectures_1 = __importDefault(require("./routes/lectures"));
const notes_1 = __importDefault(require("./routes/notes"));
const flashcards_1 = __importDefault(require("./routes/flashcards"));
const quizzes_1 = __importDefault(require("./routes/quizzes"));
const quota_1 = __importDefault(require("./routes/quota"));
const payments_1 = __importDefault(require("./routes/payments"));
const cards_1 = __importDefault(require("./routes/cards"));
const avatar_1 = __importDefault(require("./routes/avatar"));
const paystack_1 = __importDefault(require("./routes/webhooks/paystack"));
const mux_1 = __importDefault(require("./routes/webhooks/mux"));
const providers_1 = __importDefault(require("./routes/admin/providers"));
const users_1 = __importDefault(require("./routes/admin/users"));
const admin_1 = __importDefault(require("./routes/admin"));
const settings_1 = __importDefault(require("./routes/settings"));
const search_1 = __importDefault(require("./routes/search"));
const past_papers_1 = __importDefault(require("./routes/past-papers"));
const translate_1 = __importDefault(require("./routes/translate"));
const billing_1 = __importDefault(require("./routes/billing"));
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.use((0, helmet_1.default)());
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
}));
// Global Middlewares
app.use(cors_1.corsMiddleware);
app.use(requestLogger_1.requestLogger);
// Webhooks (need raw body for signature verification before parsing JSON)
app.use('/api/webhooks/paystack', express_1.default.raw({ type: 'application/json' }), paystack_1.default);
app.use('/api/webhooks/mux', express_1.default.raw({ type: 'application/json' }), mux_1.default);
// Body Parser for all other routes
app.use(express_1.default.json());
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/ai', ai_1.default);
app.use('/api/courses', courses_1.default);
app.use('/api/lectures', lectures_1.default);
app.use('/api/notes', notes_1.default);
app.use('/api/past-papers', past_papers_1.default);
app.use('/api/flashcards', flashcards_1.default);
app.use('/api/quizzes', quizzes_1.default);
app.use('/api/search', search_1.default);
app.use('/api/quota', quota_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/cards', cards_1.default);
app.use('/api/users/me', avatar_1.default);
// Admin API Routes
app.use('/api/admin/providers', providers_1.default);
app.use('/api/admin/users', users_1.default); // Existing old routes
app.use('/api/admin', admin_1.default); // New unified router
app.use('/api/settings', settings_1.default);
app.use('/api/translate', translate_1.default);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
const PORT = Number(env_1.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
    requestLogger_1.logger.info(`Backend server is running on http://0.0.0.0:${PORT} in ${env_1.env.NODE_ENV} mode.`);
});
