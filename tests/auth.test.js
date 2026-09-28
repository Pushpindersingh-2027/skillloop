const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');

let app;

beforeAll(async () => {
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillloop-test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
  process.env.NODE_ENV = 'test';
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  const User = require('../src/models/User');
  await User.deleteMany({});
});

// Helper: sign up a user and return the response
const signup = (firstName, password = 'password123') =>
  request(app)
    .post('/api/auth/signup')
    .send({
      firstName,
      email: `${firstName.toLowerCase()}@skillloop.local`,
      password
    });

// ─── Signup ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  it('creates a new user and returns a token', async () => {
    const res = await signup('Alice');

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.firstName).toBe('Alice');
    expect(res.body.user.email).toBe('alice@skillloop.local');
  });

  it('rejects signup when firstName is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'nofirst@skillloop.local', password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects signup when password is too short', async () => {
    const res = await signup('Bob', '123');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate user signup', async () => {
    await signup('Charlie');
    const res = await signup('Charlie');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ─── Signin ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/signin', () => {
  beforeEach(async () => {
    await signup('Dave');
  });

  it('signs in with correct credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'dave@skillloop.local', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('rejects signin with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'dave@skillloop.local', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects signin with unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'nobody@skillloop.local', password: 'password123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects signin when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'dave@skillloop.local' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Protected route: GET /api/auth/me (verifyAuth) ──────────────────────────

describe('GET /api/auth/me', () => {
  it('returns user data when token is valid', async () => {
    const signupRes = await signup('Eve');
    const token = signupRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('rejects request with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.statusCode).toBe(401);
  });

  it('rejects request with an expired token', async () => {
    const expiredToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString() },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forgedToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString() },
      'wrong-secret',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.statusCode).toBe(401);
  });
});

// ─── Other protected routes (verifyAuth) ─────────────────────────────────────

describe('Protected auth routes without a token', () => {
  it('rejects POST /api/auth/signout with no token', async () => {
    const res = await request(app).post('/api/auth/signout');
    expect(res.statusCode).toBe(401);
  });

  it('rejects PUT /api/auth/update-password with no token', async () => {
    const res = await request(app)
      .put('/api/auth/update-password')
      .send({ currentPassword: 'password123', newPassword: 'newpassword123' });

    expect(res.statusCode).toBe(401);
  });
});