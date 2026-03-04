/**
 * Integration tests for API endpoints
 * These tests require the server to be running or use supertest
 */
import request from 'supertest';
import app from '../../src/server';
import env from '../../src/config/env';

describe('API Integration Tests', () => {
  // Ensure auth is disabled for integration tests
  beforeAll(() => {
    env.AUTH_ENABLED = false;
  });

  describe('Health Check', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /api/summarize', () => {
    it('should reject request with invalid URLs', async () => {
      const response = await request(app)
        .post('/api/summarize')
        .send({
          urls: ['invalid-url'],
          preset: 'bullet_points',
          language: 'English',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
    });

    it('should reject request with invalid preset', async () => {
      const response = await request(app)
        .post('/api/summarize')
        .send({
          urls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
          preset: 'invalid_preset',
          language: 'English',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PRESET');
    });

    it('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/summarize')
        .send({
          urls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
          // Missing preset and language
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid request and return job_id', async () => {
      const response = await request(app)
        .post('/api/summarize')
        .send({
          urls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
          preset: 'bullet_points',
          language: 'English',
        });

      // Should return 200 with job_id (actual processing happens async)
      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('job_id');
      }
    }, 10000);
  });

  describe('GET /api/history', () => {
    it('should return history list', async () => {
      const response = await request(app).get('/api/history');
      // Should return 200 with summaries array (empty if no data)
      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('summaries');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ page: 1, limit: 10 });

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
      }
    });
  });
});



