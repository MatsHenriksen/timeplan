const request = require('supertest');
const app = require('../server');
const bcrypt = require('bcrypt');

describe('Authentication Tests', () => {
    describe('POST /api/register', () => {
        test('Should register a new user successfully', async () => {
            const newUser = {
                brukernavn: 'test.user',
                passord: 'TestPass123',
                rolle: 'elev',
                klasse: '1A'
            };

            const response = await request(app)
                .post('/api/register')
                .send(newUser)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User created successfully');
            expect(response.body).toHaveProperty('userId');
        });

        test('Should reject registration with existing username', async () => {
            const duplicateUser = {
                brukernavn: 'existing.user',
                passord: 'TestPass123',
                rolle: 'elev',
                klasse: '1A'
            };

            // First registration
            await request(app)
                .post('/api/register')
                .send(duplicateUser);

            // Duplicate registration
            const response = await request(app)
                .post('/api/register')
                .send(duplicateUser)
                .expect(409);

            expect(response.body).toHaveProperty('error', 'Username already exists');
        });

        test('Should reject registration with missing fields', async () => {
            const incompleteUser = {
                brukernavn: 'test.user'
            };

            const response = await request(app)
                .post('/api/register')
                .send(incompleteUser)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Missing required fields');
        });
    });

    describe('POST /api/login', () => {
        test('Should login with valid credentials', async () => {
            const credentials = {
                brukernavn: 'kari.nordmann',
                passord: 'lærer123'
            };

            const response = await request(app)
                .post('/api/login')
                .send(credentials)
                .expect(200);

            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.rolle).toBe('lærer');
        });

        test('Should reject login with invalid credentials', async () => {
            const invalidCredentials = {
                brukernavn: 'kari.nordmann',
                passord: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/login')
                .send(invalidCredentials)
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid credentials');
        });

        test('Should reject login with non-existent user', async () => {
            const nonExistentUser = {
                brukernavn: 'does.not.exist',
                passord: 'anypassword'
            };

            const response = await request(app)
                .post('/api/login')
                .send(nonExistentUser)
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid credentials');
        });
    });
});
