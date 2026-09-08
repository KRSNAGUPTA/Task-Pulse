import express from 'express';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import taskRoutes from './routes/task.route.js';
import { authenticateUser } from './middlewares/auth.middleware.js';

const app = express();

// 1. Parsing Middleware
app.use(express.json());
app.use(cors());

// 2. Mongo Sanitize (Ensure replaceWith option to prevent crashes)
app.use(
  mongoSanitize({
    replaceWith: '_',
  })
);

// 3. Health Check
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Task Service API!' });
});

// 4. Protected Task Routes
app.use('/api/task', authenticateUser, taskRoutes);

export default app;