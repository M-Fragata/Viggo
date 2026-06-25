/*
import { vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { prismaMock } from './mocks/prisma.mock.js';
import { jwtMock } from './mocks/jwt.mock.js';
import { bcryptMock } from './mocks/bcrypt.mock.js';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3334';
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$reset();
  jwtMock.$reset();
  bcryptMock.$reset();
});

afterAll(() => {
  vi.restoreAllMocks();
});

global.vi = vi;
*/