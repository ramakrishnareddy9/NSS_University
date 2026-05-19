const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

let app;
let studentUser;
let adminUser;
let studentToken;
let adminToken;

const allowedStudentStatuses = ['published', 'ongoing', 'completed'];

describe('Events Status Filter Authorization', () => {
  beforeAll(async () => {
    // Initialize Express app
    app = require('../server');
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    // Clear relevant collections
    await Event.deleteMany({});
    await User.deleteMany({});
    await AuditLog.deleteMany({});

    // Create test users
    studentUser = await User.create({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'hashedpassword',
      role: 'student',
      isActive: true
    });

    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin',
      isActive: true
    });

    // Generate JWT tokens
    studentToken = jwt.sign(
      { id: studentUser._id, role: 'student' },
      process.env.JWT_SECRET || 'test-secret'
    );

    adminToken = jwt.sign(
      { id: adminUser._id, role: 'admin' },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Create test events with different statuses
    await Event.create([
      {
        title: 'Published Event',
        status: 'published',
        organizer: adminUser._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        isDeleted: false
      },
      {
        title: 'Ongoing Event',
        status: 'ongoing',
        organizer: adminUser._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        isDeleted: false
      },
      {
        title: 'Completed Event',
        status: 'completed',
        organizer: adminUser._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        isDeleted: false
      },
      {
        title: 'Draft Event',
        status: 'draft',
        organizer: adminUser._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        isDeleted: false
      }
    ]);
  });

  afterAll(async () => {
    await Event.deleteMany({});
    await User.deleteMany({});
    await AuditLog.deleteMany({});
  });

  describe('Student Event Visibility', () => {
    it('should return only allowed statuses when student makes GET /api/events with no status filter', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      // Should include published, ongoing, completed; NOT draft
      const statuses = res.body.data.map(e => e.status);
      expect(statuses).toContain('published');
      expect(statuses).toContain('ongoing');
      expect(statuses).toContain('completed');
      expect(statuses).not.toContain('draft');
    });

    it('should allow student to filter by valid status: published', async () => {
      const res = await request(app)
        .get('/api/events?status=published')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(e => {
        expect(e.status).toBe('published');
      });
    });

    it('should allow student to filter by valid status: ongoing', async () => {
      const res = await request(app)
        .get('/api/events?status=ongoing')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      res.body.data.forEach(e => {
        expect(e.status).toBe('ongoing');
      });
    });

    it('should allow student to filter by valid status: completed', async () => {
      const res = await request(app)
        .get('/api/events?status=completed')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      res.body.data.forEach(e => {
        expect(e.status).toBe('completed');
      });
    });

    it('should ignore invalid status request from student (status=draft) and return default filter', async () => {
      const res = await request(app)
        .get('/api/events?status=draft')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      // Should not return draft events; should return only allowed statuses
      const statuses = res.body.data.map(e => e.status);
      expect(statuses).not.toContain('draft');
      expect(statuses.every(s => allowedStudentStatuses.includes(s))).toBe(true);
    });

    it('should log audit event when student attempts to bypass status filter', async () => {
      await request(app)
        .get('/api/events?status=draft')
        .set('Authorization', `Bearer ${studentToken}`);

      // Give async operation time to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const auditLog = await AuditLog.findOne({
        action: 'ATTEMPTED_STATUS_FILTER_BYPASS',
        actor: studentUser._id
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.details.requestedStatus).toBe('draft');
      expect(auditLog.details.allowedStatuses).toEqual(allowedStudentStatuses);
    });

    it('should ignore invalid status request from student (status=random) and return default filter', async () => {
      const res = await request(app)
        .get('/api/events?status=random-invalid-status')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      const statuses = res.body.data.map(e => e.status);
      expect(statuses).not.toContain('random-invalid-status');
      expect(statuses.every(s => allowedStudentStatuses.includes(s))).toBe(true);
    });
  });

  describe('Admin Event Visibility', () => {
    it('should return all events when admin makes GET /api/events with no status filter', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      // Admin should see all statuses
      const statuses = res.body.data.map(e => e.status);
      expect(statuses).toContain('published');
      expect(statuses).toContain('draft');
    });

    it('should allow admin to filter by status=draft', async () => {
      const res = await request(app)
        .get('/api/events?status=draft')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(e => {
        expect(e.status).toBe('draft');
      });
    });

    it('should allow admin to filter by status=published', async () => {
      const res = await request(app)
        .get('/api/events?status=published')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      res.body.data.forEach(e => {
        expect(e.status).toBe('published');
      });
    });

    it('should not create audit log for admin status requests', async () => {
      const auditLogsBefore = await AuditLog.countDocuments({
        action: 'ATTEMPTED_STATUS_FILTER_BYPASS'
      });

      await request(app)
        .get('/api/events?status=draft')
        .set('Authorization', `Bearer ${adminToken}`);

      const auditLogsAfter = await AuditLog.countDocuments({
        action: 'ATTEMPTED_STATUS_FILTER_BYPASS'
      });

      // No new audit logs should be created for admin
      expect(auditLogsAfter).toBe(auditLogsBefore);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle case-insensitive status comparison safely', async () => {
      const res = await request(app)
        .get('/api/events?status=DRAFT')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      // Should treat DRAFT as invalid (case-sensitive check)
      const statuses = res.body.data.map(e => e.status);
      expect(statuses).not.toContain('DRAFT');
      expect(statuses.every(s => allowedStudentStatuses.includes(s))).toBe(true);
    });

    it('should handle empty status parameter from student', async () => {
      const res = await request(app)
        .get('/api/events?status=')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should not log audit events for valid student status requests', async () => {
      await AuditLog.deleteMany({});

      await request(app)
        .get('/api/events?status=published')
        .set('Authorization', `Bearer ${studentToken}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      const auditLogs = await AuditLog.countDocuments({
        action: 'ATTEMPTED_STATUS_FILTER_BYPASS'
      });

      expect(auditLogs).toBe(0);
    });
  });
});
