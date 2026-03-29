import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Integration tests for the auth endpoints.
 *
 * These tests require a running database with a valid DATABASE_URL.
 * When no database is available, the entire suite will be skipped.
 *
 * To run:
 *   DATABASE_URL=postgresql://... npx vitest run src/services/__tests__/auth.integration.test.ts
 */

const HAS_DATABASE = !!process.env.DATABASE_URL;

// Dynamic import to avoid PrismaClient initialization when no DB
async function getApp() {
  const { default: app } = await import('../../app');
  return app;
}

async function makeRequest() {
  const { default: request } = await import('supertest');
  const app = await getApp();
  return (await makeRequest());
}

describe.skipIf(!HAS_DATABASE)('Auth Integration - /api/auth', () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const password = 'securePassword123';
  let authToken: string;

  // -------------------------------------------------------------------------
  // POST /api/auth/register
  // -------------------------------------------------------------------------

  describe('POST /api/auth/register', () => {
    it('returns 201 and user + token for valid registration', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/register')
        .send({ name: 'Test User', email: uniqueEmail, password, region: 'SP' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(uniqueEmail);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
    });

    it('returns error for duplicate email', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/register')
        .send({ name: 'Duplicate', email: uniqueEmail, password, region: 'SP' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid email', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password, region: 'SP' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for short password (less than 6 chars)', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'short@example.com', password: '123', region: 'SP' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/auth/login
  // -------------------------------------------------------------------------

  describe('POST /api/auth/login', () => {
    it('returns token for correct credentials', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/login')
        .send({ email: uniqueEmail, password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');

      // Save token for subsequent tests
      authToken = res.body.data.token as string;
    });

    it('returns 401 for wrong password', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/login')
        .send({ email: uniqueEmail, password: 'wrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 for non-existent email', async () => {
      const res = await (await makeRequest())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/auth/me
  // -------------------------------------------------------------------------

  describe('GET /api/auth/me', () => {
    it('returns user data with valid token', async () => {
      // Ensure we have a token from the login test
      expect(authToken).toBeDefined();

      const res = await (await makeRequest())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(uniqueEmail);
    });

    it('returns 401 without token', async () => {
      const res = await (await makeRequest()).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 with invalid token', async () => {
      const res = await (await makeRequest())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
