import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { Task, TaskStatus } from '../models/task.model.js';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_123';
process.env.JWT_SECRET = JWT_SECRET;
let mongoServer: MongoMemoryServer;

// Helper to generate mock auth tokens
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
};

const userAToken = generateToken('user_A_123');
const userBToken = generateToken('user_B_456');

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
    .send({
      title: 'Test Task',
      // metadata:{}
    });

  // console.log('VALIDATION ERRORS:', JSON.stringify(res.body, null, 2)); 

  expect(res.status).toBe(201);
});
  });

  describe('GET /api/task (Tenant Data Isolation)', () => {
    it('should only return tasks belonging to the requesting user', async () => {
      // Seed task for User A
      await Task.create({
        userId: 'user_A_123',
        title: 'User A Task',
        status: TaskStatus.TO_DO,
      });

      // Seed task for User B
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