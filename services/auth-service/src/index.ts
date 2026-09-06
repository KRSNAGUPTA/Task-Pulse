import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { prisma } from './utils/prisma.js';
import authRoutes from "./routes/auth.routes.js"
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// 1. MUST BE BEFORE ROUTES
app.use(cors());
app.use(express.json());
app.use(cookieParser());
// 2. Safely handle optional body properties
app.post('/test-user', async (req, res) => {
  try {
    const body = req.body || {}; // Fallback in case body is undefined
    const email = body.email || `test-${Date.now()}@example.com`;
    const name = body.name || 'Test User';

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: 'dummy_hashed_password',
      },
    });

    const allUsers = await prisma.user.findMany();

    res.status(201).json({
      message: 'Prisma 7 read/write success!',
      createdUser: user,
      totalUsersInDb: allUsers.length,
    });
  } catch (error) {
    console.error('Prisma Test Error:', error);
    res.status(500).json({ error: 'Database query failed', details: error });
  }
});

app.use("/api/auth", authRoutes)

app.listen(PORT, () => {
  console.log(`Auth Service listening on http://localhost:${PORT}`);
});

export default app;