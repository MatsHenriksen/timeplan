// scripts/seed.js - Seed database with test data
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'timeplan_db'
    });

    try {
        console.log('Starting database seed...');

        // Clear existing data
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('TRUNCATE TABLE timeplan');
        await connection.execute('TRUNCATE TABLE brukere');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // Create test users
        const users = [
            { brukernavn: 'admin', passord: 'admin123', rolle: 'lærer', klasse: null },
            { brukernavn: 'kari.nordmann', passord: 'lærer123', rolle: 'lærer', klasse: null },
            { brukernavn: 'per.hansen', passord: 'lærer123', rolle: 'lærer', klasse: null },
            { brukernavn: 'anne.olsen', passord: 'lærer123', rolle: 'lærer', klasse: null },
            { brukernavn: 'ole.berg', passord: 'lærer123', rolle: 'lærer', klasse: null },
            { brukernavn: 'elev1a.1', passord: 'elev123', rolle: 'elev', klasse: '1A' },
            { brukernavn: 'elev1a.2', passord: 'elev123', rolle: 'elev', klasse: '1A' },
            { brukernavn: 'elev1b.1', passord: 'elev123', rolle: 'elev', klasse: '1B' },
            { brukernavn: 'elev2a.1', passord: 'elev123', rolle: 'elev', klasse: '2A' },
            { brukernavn: 'elev2b.1', passord: 'elev123', rolle: 'elev', klasse: '2B' },
            { brukernavn: 'elev3a.1', passord: 'elev123', rolle: 'elev', klasse: '3A' },
            { brukernavn: 'elev3b.1', passord: 'elev123', rolle: 'elev', klasse: '3B' }
        ];

        const userIds = {};
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.passord, 10);
            const [result] = await connection.execute(
                'INSERT INTO brukere (brukernavn, passord_hash, klasse, rolle) VALUES (?, ?, ?, ?)',
                [user.brukernavn, hashedPassword, user.klasse, user.rolle]
            );
            userIds[user.brukernavn] = result.insertId;
            console.log(`Created user: ${user.brukernavn}`);
        }

        // Create sample schedule
        const schedule = [
            // 1A - Mandag
            {
                lærer: 'kari.nordmann', klasse: '1A', start: '08:15', slutt: '09:00',
                days: { man: true, tir: false, ons: true, tor: false, fre: true },
                fag: 'Matematikk', rom: 'A201'
            },
            {
                lærer: 'per.hansen', klasse: '1A', start: '09:15', slutt: '10:00',
                days: { man: true, tir: true, ons: false, tor: true, fre: false },
                fag: 'Norsk', rom: 'B102'
            },
            {
                lærer: 'anne.olsen', klasse: '1A', start: '10:15', slutt: '11:00',
                days: { man: true, tir: false, ons: true, tor: false, fre: true },
                fag: 'Engelsk', rom: 'B103'
            },
            {
                lærer: 'ole.berg', klasse: '1A', start: '11:15', slutt: '12:00',
                days: { man: false, tir: true, ons: false, tor: true, fre: false },
                fag: 'Naturfag', rom: 'LAB1'
            },
            {
                lærer: 'kari.nordmann', klasse: '1A', start: '12:45', slutt: '13:30',
                days: { man: true, tir: false, ons: true, tor: false, fre: false },
                fag: 'Samfunnsfag', rom: 'C201'
            },

            // 1B
            {
                lærer: 'per.hansen', klasse: '1B', start: '08:15', slutt: '09:00',
                days: { man: false, tir: true, ons: false, tor: true, fre: false },
                fag: 'Norsk', rom: 'B102'
            },
            {
                lærer: 'kari.nordmann', klasse: '1B', start: '09:15', slutt: '10:00',
                days: { man: false, tir: true, ons: false, tor: true, fre: true },
                fag: 'Matematikk', rom: 'A201'
            },
            {
                lærer: 'ole.berg', klasse: '1B', start: '10:15', slutt: '11:00',
                days: { man: true, tir: true, ons: true, tor: false, fre: false },
                fag: 'Naturfag', rom: 'LAB1'
            },
            {
                lærer: 'anne.olsen', klasse: '1B', start: '11:15', slutt: '12:00',
                days: { man: true, tir: false, ons: true, tor: true, fre: false },
                fag: 'Engelsk', rom: 'B103'
            },

            // 2A
            {
                lærer: 'anne.olsen', klasse: '2A', start: '08:15', slutt: '09:00',
                days: { man: true, tir: false, ons: true, tor: false, fre: true },
                fag: 'Engelsk', rom: 'B104'
            },
            {
                lærer: 'ole.berg', klasse: '2A', start: '09:15', slutt: '10:00',
                days: { man: false, tir: true, ons: false, tor: true, fre: true },
                fag: 'Kjemi', rom: 'LAB2'
            },
            {
                lærer: 'kari.nordmann', klasse: '2A', start: '10:15', slutt: '11:00',
                days: { man: true, tir: true, ons: true, tor: false, fre: false },
                fag: 'Matematikk R1', rom: 'A202'
            },

            // 2B
            {
                lærer: 'per.hansen', klasse: '2B', start: '10:15', slutt: '11:00',
                days: { man: false, tir: true, ons: true, tor: true, fre: true },
                fag: 'Norsk', rom: 'B105'
            },
            {
                lærer: 'kari.nordmann', klasse: '2B', start: '11:15', slutt: '12:00',
                days: { man: true, tir: false, ons: true, tor: false, fre: true },
                fag: 'Matematikk S1', rom: 'A203'
            },

            // 3A
            {
                lærer: 'ole.berg', klasse: '3A', start: '08:15', slutt: '09:45',
                days: { man: true, tir: false, ons: false, tor: true, fre: false },
                fag: 'Fysikk', rom: 'LAB3'
            },
            {
                lærer: 'anne.olsen', klasse: '3A', start: '10:00', slutt: '10:45',
                days: { man: true, tir: true, ons: false, tor: false, fre: true },
                fag: 'Engelsk', rom: 'B106'
            },

            // 3B
            {
                lærer: 'per.hansen', klasse: '3B', start: '12:45', slutt: '14:15',
                days: { man: false, tir: true, ons: false, tor: true, fre: false },
                fag: 'Norsk', rom: 'B107'
            },
            {
                lærer: 'kari.nordmann', klasse: '3B', start: '14:30', slutt: '15:15',
                days: { man: true, tir: false, ons: true, tor: false, fre: true },
                fag: 'Matematikk R2', rom: 'A204'
            }
        ];

        for (const item of schedule) {
            const lærerId = userIds[item.lærer];
            const [result] = await connection.execute(
                `INSERT INTO timeplan 
                (lærer_id, klasse, tidspunkt_start, tidspunkt_slutt, 
                 mandag, tirsdag, onsdag, torsdag, fredag, fag, rom)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lærerId,
                    item.klasse,
                    item.start,
                    item.slutt,
                    item.days.man,
                    item.days.tir,
                    item.days.ons,
                    item.days.tor,
                    item.days.fre,
                    item.fag,
                    item.rom
                ]
            );
            console.log(`Added schedule item: ${item.fag} for ${item.klasse}`);
        }

        console.log('\n✅ Database seeded successfully!');
        console.log('\nTest accounts:');
        console.log('Teachers: kari.nordmann / lærer123, per.hansen / lærer123');
        console.log('Students: elev1a.1 / elev123 (class 1A), elev2b.1 / elev123 (class 2B)');
        
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

seedDatabase();

