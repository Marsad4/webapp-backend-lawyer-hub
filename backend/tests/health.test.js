const request = require('supertest');
const app = require('../server');

describe('Health endpoint', () => {
  it('responds OK', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

