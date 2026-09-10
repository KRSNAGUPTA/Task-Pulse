import express from 'express';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import taskRoutes from './routes/task.route.js';
import { authenticateUser } from './middlewares/auth.middleware.js';

const app = express();

app.use(express.json());
app.use(cors());

// Mongo Sanitize
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  next();
});

// Health Check
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Task Service API!' });
});

// Protected Task Routes
app.use('/api/task', authenticateUser, taskRoutes);

// Explicit Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

export default app;