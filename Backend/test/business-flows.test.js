const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const mockRouteAuth = {
  auth: (req, res, next) => {
    const userId = req.header('x-test-user-id') || 'student-1';
    const role = req.header('x-test-role') || 'student';
    req.user = { id: userId, _id: userId, role };
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions' });
    }

    return next();
  }
};

const mockValidateObjectId = () => (req, res, next) => next();
const mockPagination = {
  getPagination: () => ({ page: 1, limit: 20, skip: 0 }),
  buildPagedResponse: (items, total, page, limit) => ({
    success: true,
    data: items,
    pagination: { total, page, limit }
  })
};

jest.mock('../middleware/auth', () => mockRouteAuth);
jest.mock('../middleware/validateObjectId', () => mockValidateObjectId);
jest.mock('../utils/pagination', () => mockPagination);
jest.mock('../config/redis', () => ({
  del: jest.fn().mockResolvedValue(true),
  purgePattern: jest.fn().mockResolvedValue(true)
}));
jest.mock('../utils/notifications', () => ({
  sendRegistrationConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendApprovalNotification: jest.fn().mockResolvedValue({ success: true }),
  sendWaitlistPromotionNotification: jest.fn().mockResolvedValue({ success: true }),
  sendContributionVerified: jest.fn().mockResolvedValue({ success: true })
}));

const createQuery = (result) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
    exec: jest.fn().mockResolvedValue(result)
  };

  return query;
};

const makeDoc = (fields = {}) => {
  const doc = { ...fields };
  doc.save = jest.fn().mockResolvedValue(doc);
  doc.populate = jest.fn(async function (path) {
    if (path === 'student') {
      this.student = this.student || { _id: 'student-1', name: 'Test Student', email: 'student@test.com', studentId: 'STU-1', totalVolunteerHours: 0 };
    }
    if (path === 'event') {
      this.event = this.event || { _id: 'event-1', title: 'Sample Event', eventType: 'other', startDate: new Date('2026-05-23T09:00:00Z'), endDate: new Date('2026-05-23T11:30:00Z'), academicYear: '2025-26', location: 'Main Hall' };
    }
    if (path === 'verifiedBy') {
      this.verifiedBy = this.verifiedBy || { _id: 'admin-1', name: 'Admin' };
    }
    return this;
  });
  doc.toObject = () => ({ ...doc });
  return doc;
};

const Participation = require('../models/Participation');
const Event = require('../models/Event');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const AcademicYearConfig = require('../models/AcademicYearConfig');
const AuditLog = require('../models/AuditLog');

jest.mock('../models/Participation', () => jest.fn());
jest.mock('../models/Event', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn()
}));
jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));
jest.mock('../models/Contribution', () => jest.fn());
jest.mock('../models/AcademicYearConfig', () => ({
  findOne: jest.fn()
}));
jest.mock('../models/AuditLog', () => ({
  create: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn()
}));

const participationsRouter = require('../routes/participations');
const contributionsRouter = require('../routes/contributions');
const usersRouter = require('../routes/users');

const app = express();
app.use(express.json());
app.use('/api/participations', participationsRouter);
app.use('/api/contributions', contributionsRouter);
app.use('/api/users', usersRouter);

beforeEach(() => {
  jest.clearAllMocks();

  Participation.findOne = jest.fn();
  Participation.findById = jest.fn();
  Participation.findOneAndUpdate = jest.fn();
  Participation.find = jest.fn();
  Participation.countDocuments = jest.fn();
  Event.findOneAndUpdate = jest.fn();
  Contribution.findOne = jest.fn();
  Contribution.find = jest.fn();
  Contribution.countDocuments = jest.fn();

  mongoose.startSession = jest.fn().mockResolvedValue({
    withTransaction: async (fn) => fn(),
    endSession: jest.fn()
  });
});

describe('Participation and contribution business flows', () => {
  it('waitlists a student when an event is full', async () => {
    const event = {
      _id: 'event-1',
      status: 'published',
      registrationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 10,
      currentParticipants: 10,
      academicYear: '2025-26',
      startDate: new Date('2026-05-23T09:00:00Z'),
      endDate: new Date('2026-05-23T11:00:00Z')
    };
    Event.findById.mockReturnValue(createQuery(event));
    Event.findOneAndUpdate.mockResolvedValue(event);
    Participation.findOne.mockReturnValue(createQuery(null));

    const created = makeDoc({
      _id: 'participation-1',
      student: 'student-1',
      event: 'event-1',
      status: 'pending',
      waitlistStatus: 'waitlisted',
      waitlistedAt: new Date()
    });
    Participation.mockImplementation(() => created);
    created.populate.mockImplementation(async function (path) {
      if (path === 'student') {
        this.student = { _id: 'student-1', name: 'Test Student', email: 'student@test.com', studentId: 'STU-1' };
      }
      if (path === 'event') {
        this.event = { _id: 'event-1', title: 'Sample Event', eventType: 'other', startDate: event.startDate, endDate: event.endDate, location: 'Main Hall' };
      }
      return this;
    });

    const res = await request(app)
      .post('/api/participations')
      .set('x-test-user-id', 'student-1')
      .set('x-test-role', 'student')
      .send({ eventId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(201);
    expect(res.body.waitlistStatus).toBe('waitlisted');
    expect(res.body.message).toMatch(/waitlist/i);
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $inc: expect.anything() }), expect.anything());
  });

  it('rejects a waitlisted participation without decrementing the event counter', async () => {
    const rejected = makeDoc({
      _id: 'participation-2',
      student: { _id: 'student-1', name: 'Test Student', studentId: 'STU-1' },
      event: { _id: 'event-1', title: 'Sample Event', eventType: 'other' },
      status: 'rejected',
      waitlistStatus: 'waitlisted',
      isDeleted: false
    });

    Participation.findOneAndUpdate.mockResolvedValue(rejected);
    Participation.findById.mockReturnValue(createQuery(rejected));

    const res = await request(app)
      .put('/api/participations/participation-2/reject')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('calculates volunteer hours from the event window when attendance is marked', async () => {
    const event = {
      _id: 'event-1',
      title: 'Sample Event',
      eventType: 'other',
      startDate: new Date('2026-05-23T09:00:00Z'),
      endDate: new Date('2026-05-23T11:30:00Z')
    };
    const participationDoc = makeDoc({
      _id: 'participation-3',
      student: { _id: 'student-1', name: 'Test Student', email: 'student@test.com', totalVolunteerHours: 12 },
      event,
      status: 'approved',
      attendance: false,
      volunteerHours: 0,
      isDeleted: false
    });

    Participation.findById.mockReturnValue(createQuery(participationDoc));
    User.findById.mockReturnValue(createQuery(makeDoc({ _id: 'student-1', totalVolunteerHours: 12 })));

    const res = await request(app)
      .put('/api/participations/participation-3/attendance')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin')
      .send({ attended: true });

    expect(res.status).toBe(200);
    expect(res.body.volunteerHours).toBeCloseTo(2.5, 1);
    expect(User.findById).toHaveBeenCalled();
  });

  it('rejects contribution submission until attendance is recorded', async () => {
    const participationDoc = makeDoc({
      _id: 'participation-4',
      student: 'student-1',
      attendance: false,
      status: 'attended',
      isDeleted: false,
      event: { _id: 'event-1', title: 'Sample Event', eventType: 'other', startDate: new Date('2026-05-23T09:00:00Z'), endDate: new Date('2026-05-23T11:30:00Z'), academicYear: '2025-26' }
    });
    Participation.findById.mockReturnValue(participationDoc);

    const res = await request(app)
      .post('/api/contributions')
      .set('x-test-user-id', 'student-1')
      .set('x-test-role', 'student')
      .send({ participationId: 'participation-4', report: 'Volunteer report' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/attendance must be recorded/i);
  });
});

describe('Certificate eligibility', () => {
  it('marks a student eligible when volunteer hours meet the academic-year threshold', async () => {
    User.findById.mockReturnValue(createQuery({
      _id: 'student-1',
      role: 'student',
      name: 'Test Student',
      email: 'student@test.com',
      totalVolunteerHours: 260,
      academicYear: '2025-26'
    }));

    Participation.find.mockReturnValue(createQuery([
      { _id: 'p1', event: { title: 'Event 1' } },
      { _id: 'p2', event: { title: 'Event 2' } }
    ]));
    Contribution.find.mockReturnValue(createQuery([
      { _id: 'c1', volunteerHours: 10 }
    ]));
    AcademicYearConfig.findOne
      .mockReturnValueOnce(createQuery({ certificateHoursRequired: 240 }))
      .mockReturnValueOnce(createQuery({ certificateHoursRequired: 240 }));

    const res = await request(app)
      .get('/api/users/student/student-1')
      .set('x-test-user-id', 'student-1')
      .set('x-test-role', 'student');

    expect(res.status).toBe(200);
    expect(res.body.certificateHoursRequired).toBe(240);
    expect(res.body.certificateEligible).toBe(true);
  });
});
