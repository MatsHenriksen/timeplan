const request = require('supertest');
const app = require('../server');

describe('Schedule Tests', () => {
    let authToken;
    let teacherToken;

    beforeAll(async () => {
        // Get student token
        const studentLogin = await request(app)
            .post('/api/login')
            .send({ brukernavn: 'elev1a.1', passord: 'elev123' });
        authToken = studentLogin.body.token;

        // Get teacher token
        const teacherLogin = await request(app)
            .post('/api/login')
            .send({ brukernavn: 'kari.nordmann', passord: 'lærer123' });
        teacherToken = teacherLogin.body.token;
    });

    describe('GET /api/schedule', () => {
        test('Should get schedule for authenticated user', async () => {
            const response = await request(app)
                .get('/api/schedule')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('id');
                expect(response.body[0]).toHaveProperty('class');
                expect(response.body[0]).toHaveProperty('subject');
                expect(response.body[0]).toHaveProperty('room');
            }
        });

        test('Should filter schedule by class', async () => {
            const response = await request(app)
                .get('/api/schedule?klasse=1A')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            response.body.forEach(item => {
                expect(item.class).toBe('1A');
            });
        });

        test('Should reject request without authentication', async () => {
            await request(app)
                .get('/api/schedule')
                .expect(401);
        });
    });

    describe('POST /api/schedule', () => {
        test('Teacher should add new class successfully', async () => {
            const newClass = {
                klasse: '1A',
                tidspunkt_start: '15:00',
                tidspunkt_slutt: '15:45',
                mandag: true,
                tirsdag: false,
                onsdag: false,
                torsdag: false,
                fredag: false,
                fag: 'Ekstra matematikk',
                rom: 'A301'
            };

            const response = await request(app)
                .post('/api/schedule')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send(newClass)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Class added successfully');
            expect(response.body).toHaveProperty('id');
        });

        test('Should detect time conflicts', async () => {
            const conflictingClass = {
                klasse: '1A',
                tidspunkt_start: '08:00',
                tidspunkt_slutt: '09:00',
                mandag: true,
                tirsdag: false,
                onsdag: false,
                torsdag: false,
                fredag: false,
                fag: 'Konflikt fag',
                rom: 'A999'
            };

            const response = await request(app)
                .post('/api/schedule')
                .set('Authorization', `Bearer ${teacherToken}`)
                .send(conflictingClass)
                .expect(409);

            expect(response.body).toHaveProperty('error');
        });

        test('Student should not be able to add class', async () => {
            const newClass = {
                klasse: '1A',
                tidspunkt_start: '16:00',
                tidspunkt_slutt: '16:45',
                mandag: true,
                tirsdag: false,
                onsdag: false,
                torsdag: false,
                fredag: false,
                fag: 'Uautorisert fag',
                rom: 'X999'
            };

            await request(app)
                .post('/api/schedule')
                .set('Authorization', `Bearer ${authToken}`)
                .send(newClass)
                .expect(403);
        });
    });
});
