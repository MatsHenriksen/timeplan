const request = require('supertest');
const app = require('../server');

describe('Performance Tests', () => {
    let authToken;

    beforeAll(async () => {
        const login = await request(app)
            .post('/api/login')
            .send({ brukernavn: 'elev1a.1', passord: 'elev123' });
        authToken = login.body.token;
    });

    test('Schedule should load within 2 seconds', async () => {
        const startTime = Date.now();
        
        await request(app)
            .get('/api/schedule')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(2000);
    }, 3000); // 3 second timeout for the test

    test('Should handle concurrent requests', async () => {
        const requests = [];
        
        // Make 10 concurrent requests
        for (let i = 0; i < 10; i++) {
            requests.push(
                request(app)
                    .get('/api/schedule')
                    .set('Authorization', `Bearer ${authToken}`)
            );
        }

        const responses = await Promise.all(requests);
        
        responses.forEach(response => {
            expect(response.status).toBe(200);
        });
    });
});

// __tests__/security.test.js
const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
    test('Should not expose password hash in any response', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ brukernavn: 'kari.nordmann', passord: 'lærer123' })
            .expect(200);

        const responseString = JSON.stringify(response.body);
        expect(responseString).not.toContain('passord_hash');
        expect(responseString).not.toContain('$2b$'); // bcrypt hash pattern
    });

    test('Should handle SQL injection attempts', async () => {
        const maliciousInput = {
            brukernavn: "admin' OR '1'='1",
            passord: "' OR '1'='1"
        };

        const response = await request(app)
            .post('/api/login')
            .send(maliciousInput)
            .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('Should enforce rate limiting', async () => {
        const requests = [];
        
        // Make 101 requests (limit is 100 per 15 minutes)
        for (let i = 0; i < 101; i++) {
            requests.push(
                request(app).get('/api/health')
            );
        }

        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.status === 429);
        
        expect(rateLimited).toBe(true);
    });

    test('Should validate JWT tokens', async () => {
        const invalidToken = 'invalid.jwt.token';

        await request(app)
            .get('/api/schedule')
            .set('Authorization', `Bearer ${invalidToken}`)
            .expect(403);
    });
});
