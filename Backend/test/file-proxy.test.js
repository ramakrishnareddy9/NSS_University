const request = require('supertest');
const express = require('express');
const nock = require('nock');

// Mock auth middleware used by the router
jest.mock('../middleware/auth', () => ({
  auth: (req, res, next) => { req.user = { id: 'test-user', role: 'admin' }; next(); },
  authorize: (...roles) => (req, res, next) => next()
}));

// Mock cloudinary to return predictable signed URLs
jest.mock('../config/cloudinary', () => ({
  url: (publicId, options) => `https://res.cloudinary.com/signed/${publicId}?sig=testsign`,
}));

const reportsRouter = require('../routes/reports');

describe('GET /api/reports/file-proxy', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use('/api/reports', reportsRouter);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('redirects to signed URL when publicId provided', async () => {
    const res = await request(app).get('/api/reports/file-proxy').query({ publicId: 'nss-reports/123' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://res.cloudinary.com/signed/nss-reports/123');
  });

  test('redirects to fileUrl when HEAD content-length small', async () => {
    const fileUrl = 'https://res.cloudinary.com/demo/nss-reports/abc.pdf';
    nock('https://res.cloudinary.com').head('/demo/nss-reports/abc.pdf').reply(200, '', { 'Content-Length': '1024' });

    const res = await request(app).get('/api/reports/file-proxy').query({ url: fileUrl });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(fileUrl);
  });

  test('blocks large files', async () => {
    const fileUrl = 'https://res.cloudinary.com/demo/nss-reports/huge.pdf';
    nock('https://res.cloudinary.com').head('/demo/nss-reports/huge.pdf').reply(200, '', { 'Content-Length': String(60 * 1024 * 1024) });

    const res = await request(app).get('/api/reports/file-proxy').query({ url: fileUrl });
    expect(res.status).toBe(413);
    expect(res.body.message.toLowerCase()).toMatch(/too large/);
  });
});
