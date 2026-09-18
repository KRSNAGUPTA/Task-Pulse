
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Request, Response, NextFunction } from 'express';


// 1. Assign process.env directly inside vi.hoisted
vi.hoisted(() => {
  (process.env as Record<string, string>).JWKS_URI = 'http://mock.com';
});

// 1. Mock the auth middleware module BEFORE importing app
vi.mock('../middlewares/auth.middleware.ts', () => ({
  authenticateUser: (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: Token missing or invalid' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Map test tokens to mock user payloads
    if (token === 'user_a_token') {
      req.user = { userId: 'user_A_123', email: 'usera@example.com' };
      return next();
    }

    if (token === 'user_b_token') {
      req.user = { userId: 'user_B_456', email: 'userb@example.com' };
      return next();
    }

    res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  },
}));

// Import app AFTER vi.mock
import app from '../app.js';
import { Task, TaskStatus } from '../models/task.model.js';

let mongoServer: MongoMemoryServer;

// Simple static test tokens matching the mock implementation above
const userAToken = 'user_a_token';
const userBToken = 'user_b_token';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Task.deleteMany({});
});

describe('Task API Integration Tests', () => {
  describe('POST /api/task', () => {
    it('should return 401 if no Authorization header is provided', async () => {
      const res = await request(app).post('/api/task').send({ title: 'Test Task' });
      expect(res.status).toBe(401);
    });

    it('should create a task successfully for an authenticated user', async () => {
      const res = await request(app)
        .post('/api/task')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'Test Task' });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/task (Tenant Data Isolation)', () => {
    it('should only return tasks belonging to the requesting user', async () => {
      await Task.create({
        userId: 'user_A_123',
        title: 'User A Task',
        status: TaskStatus.TO_DO,
      });

      await Task.create({
        userId: 'user_B_456',
        title: 'User B Task',
        status: TaskStatus.TO_DO,
      });

      const res = await request(app)
        .get('/api/task')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('User A Task');
    });
  });
});