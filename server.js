// server.js - Main server file med CSP-fix
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware med justert CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'timeplan_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database tables
async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS brukere (
                id INT AUTO_INCREMENT PRIMARY KEY,
                brukernavn VARCHAR(50) UNIQUE NOT NULL,
                passord_hash VARCHAR(255) NOT NULL,
                klasse VARCHAR(10),
                rolle ENUM('lærer', 'elev') NOT NULL,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_brukernavn (brukernavn),
                INDEX idx_rolle (rolle)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create schedule table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS timeplan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lærer_id INT NOT NULL,
                klasse VARCHAR(10) NOT NULL,
                tidspunkt_start TIME NOT NULL,
                tidspunkt_slutt TIME NOT NULL,
                mandag BOOLEAN DEFAULT FALSE,
                tirsdag BOOLEAN DEFAULT FALSE,
                onsdag BOOLEAN DEFAULT FALSE,
                torsdag BOOLEAN DEFAULT FALSE,
                fredag BOOLEAN DEFAULT FALSE,
                fag VARCHAR(50) NOT NULL,
                rom VARCHAR(20) NOT NULL,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                oppdatert TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (lærer_id) REFERENCES brukere(id) ON DELETE CASCADE,
                INDEX idx_klasse (klasse),
                INDEX idx_lærer (lærer_id),
                INDEX idx_tid (tidspunkt_start, tidspunkt_slutt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        connection.release();
        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
}

// JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Check if user is teacher
function requireTeacher(req, res, next) {
    if (req.user.rolle !== 'lærer') {
        return res.status(403).json({ error: 'Teacher access required' });
    }
    next();
}

// ==================== API ROUTES ====================

// User registration
app.post('/api/register', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { brukernavn, passord, klasse, rolle } = req.body;

        // Validate input
        if (!brukernavn || !passord || !rolle) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user exists
        const [existing] = await connection.execute(
            'SELECT id FROM brukere WHERE brukernavn = ?',
            [brukernavn]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passord_hash = await bcrypt.hash(passord, saltRounds);

        // Insert user
        const [result] = await connection.execute(
            'INSERT INTO brukere (brukernavn, passord_hash, klasse, rolle) VALUES (?, ?, ?, ?)',
            [brukernavn, passord_hash, klasse || null, rolle]
        );

        res.status(201).json({ 
            message: 'User created successfully',
            userId: result.insertId 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// User login
app.post('/api/login', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { brukernavn, passord } = req.body;

        // Get user from database
        const [users] = await connection.execute(
            'SELECT id, brukernavn, passord_hash, klasse, rolle FROM brukere WHERE brukernavn = ?',
            [brukernavn]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(passord, user.passord_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                brukernavn: user.brukernavn,
                rolle: user.rolle,
                klasse: user.klasse 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                brukernavn: user.brukernavn,
                rolle: user.rolle,
                klasse: user.klasse
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Get schedule
app.get('/api/schedule', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { klasse, dag } = req.query;
        let query = `
            SELECT 
                t.*, 
                b.brukernavn as lærer_navn
            FROM timeplan t
            JOIN brukere b ON t.lærer_id = b.id
            WHERE 1=1
        `;
        const params = [];

        // Filter by class if specified (students see only their class)
        if (req.user.rolle === 'elev' && req.user.klasse) {
            query += ' AND t.klasse = ?';
            params.push(req.user.klasse);
        } else if (klasse) {
            query += ' AND t.klasse = ?';
            params.push(klasse);
        }

        // Filter by day if specified
        if (dag) {
            query += ` AND t.${dag} = TRUE`;
        }

        query += ' ORDER BY t.klasse, t.tidspunkt_start';

        const [schedule] = await connection.execute(query, params);

        // Transform response for frontend
        const transformedSchedule = schedule.map(item => ({
            id: item.id,
            teacher: item.lærer_navn,
            teacherId: item.lærer_id,
            class: item.klasse,
            startTime: item.tidspunkt_start,
            endTime: item.tidspunkt_slutt,
            monday: Boolean(item.mandag),
            tuesday: Boolean(item.tirsdag),
            wednesday: Boolean(item.onsdag),
            thursday: Boolean(item.torsdag),
            friday: Boolean(item.fredag),
            subject: item.fag,
            room: item.rom
        }));

        res.json(transformedSchedule);
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Add new class (teachers only)
app.post('/api/schedule', authenticateToken, requireTeacher, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            klasse,
            tidspunkt_start,
            tidspunkt_slutt,
            mandag,
            tirsdag,
            onsdag,
            torsdag,
            fredag,
            fag,
            rom
        } = req.body;

        // Validate input
        if (!klasse || !tidspunkt_start || !tidspunkt_slutt || !fag || !rom) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for time conflicts
        const conflictQuery = `
            SELECT id FROM timeplan 
            WHERE klasse = ? 
            AND ((tidspunkt_start < ? AND tidspunkt_slutt > ?) 
                OR (tidspunkt_start < ? AND tidspunkt_slutt > ?))
            AND (
                (? = TRUE AND mandag = TRUE) OR
                (? = TRUE AND tirsdag = TRUE) OR
                (? = TRUE AND onsdag = TRUE) OR
                (? = TRUE AND torsdag = TRUE) OR
                (? = TRUE AND fredag = TRUE)
            )
        `;

        const [conflicts] = await connection.execute(conflictQuery, [
            klasse,
            tidspunkt_slutt, tidspunkt_start,
            tidspunkt_slutt, tidspunkt_start,
            mandag, tirsdag, onsdag, torsdag, fredag
        ]);

        if (conflicts.length > 0) {
            return res.status(409).json({ error: 'Time conflict detected' });
        }

        // Check room availability
        const roomQuery = `
            SELECT id FROM timeplan 
            WHERE rom = ? 
            AND ((tidspunkt_start < ? AND tidspunkt_slutt > ?) 
                OR (tidspunkt_start < ? AND tidspunkt_slutt > ?))
            AND (
                (? = TRUE AND mandag = TRUE) OR
                (? = TRUE AND tirsdag = TRUE) OR
                (? = TRUE AND onsdag = TRUE) OR
                (? = TRUE AND torsdag = TRUE) OR
                (? = TRUE AND fredag = TRUE)
            )
        `;

        const [roomConflicts] = await connection.execute(roomQuery, [
            rom,
            tidspunkt_slutt, tidspunkt_start,
            tidspunkt_slutt, tidspunkt_start,
            mandag, tirsdag, onsdag, torsdag, fredag
        ]);

        if (roomConflicts.length > 0) {
            return res.status(409).json({ error: 'Room is not available at this time' });
        }

        // Insert new class
        const [result] = await connection.execute(
            `INSERT INTO timeplan 
            (lærer_id, klasse, tidspunkt_start, tidspunkt_slutt, 
             mandag, tirsdag, onsdag, torsdag, fredag, fag, rom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                klasse,
                tidspunkt_start,
                tidspunkt_slutt,
                Boolean(mandag),
                Boolean(tirsdag),
                Boolean(onsdag),
                Boolean(torsdag),
                Boolean(fredag),
                fag,
                rom
            ]
        );

        res.status(201).json({ 
            message: 'Class added successfully',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Add class error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Update class (teachers only)
app.put('/api/schedule/:id', authenticateToken, requireTeacher, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build update query dynamically
        const allowedFields = [
            'klasse', 'tidspunkt_start', 'tidspunkt_slutt',
            'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag',
            'fag', 'rom'
        ];

        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(id);

        const [result] = await connection.execute(
            `UPDATE timeplan SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json({ message: 'Class updated successfully' });
    } catch (error) {
        console.error('Update class error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Delete class (teachers only)
app.delete('/api/schedule/:id', authenticateToken, requireTeacher, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        const [result] = await connection.execute(
            'DELETE FROM timeplan WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer().catch(console.error);

module.exports = app;