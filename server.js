require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const fs = require('fs');
const path = require('path');
const connectDB = require('./db');
const User = require('./models/User');
const cors = require('cors');

const app = express();

// ── HTTPS Enforcement Middleware ─────────────────────────────────
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// ── CORS Configuration ───────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

let server;
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    const forge = require('node-forge');
    const https = require('https');
    
    // Generate self-signed cert for dev
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    server = https.createServer({
        key: forge.pki.privateKeyToPem(keys.privateKey),
        cert: forge.pki.certificateToPem(cert)
    }, app);
    
    // Simple HTTP to HTTPS redirect for dev
    http.createServer((req, res) => {
        const targetHost = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
        res.writeHead(301, { "Location": "https://" + targetHost + ":" + (process.env.PORT || 3000) + req.url });
        res.end();
    }).listen(8080);
} else {
    server = http.createServer(app);
}

const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });

// ── Connect to MongoDB ───────────────────────────────────────────
let isOffline = false;
connectDB().then(success => {
    if (!success) {
        isOffline = true;
    }
});

// ── Middleware & Static Files ────────────────────────────────────
app.use(express.json());

// Serve static files using an absolute path
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve index.html when users hit the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'yoma-chat-fallback-secret',
    resave: false,
    saveUninitialized: false,
    store: (process.env.MONGO_URI && !process.env.MONGO_URI.includes('mongodb.net') && !isOffline) ? MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        ttl: 24 * 60 * 60 // 1 day
    }) : undefined,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        sameSite: 'lax'
    }
});

app.use(sessionMiddleware);

// Share session with Socket.io
io.engine.use(sessionMiddleware);

// ── Auth REST Endpoints ──────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, displayName, gender, country, interests } = req.body;

        if (!email || !password || !displayName || !gender || !country) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        if (!['male', 'female'].includes(gender)) {
            return res.status(400).json({ error: 'Gender must be male or female' });
        }

        if (isOffline) {
            if (mockUsers.has(email.toLowerCase())) {
                return res.status(409).json({ error: 'Email already registered' });
            }
            const user = {
                id: `mock-${mockUserIdCounter++}`,
                email: email.toLowerCase(),
                password, // Store plain for mock simple
                displayName,
                gender,
                country,
                interests: interests || [],
                createdAt: new Date()
            };
            mockUsers.set(user.email, user);
            req.session.userId = user.id;
            return res.status(201).json({ user: toPublicJSON(user) });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const user = new User({
            email: email.toLowerCase(),
            password,
            displayName,
            gender,
            country,
            interests: interests || []
        });

        await user.save();

        req.session.userId = user._id;
        res.status(201).json({ user: user.toPublicJSON() });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (isOffline) {
            const user = mockUsers.get(email.toLowerCase());
            if (!user || user.password !== password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            req.session.userId = user.id;
            return res.json({ user: toPublicJSON(user) });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.userId = user._id;
        res.json({ user: user.toPublicJSON() });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.get('/api/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (isOffline) {
            const user = Array.from(mockUsers.values()).find(u => u.id === req.session.userId);
            if (!user) return res.status(401).json({ error: 'User not found' });
            return res.json({ user: toPublicJSON(user) });
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        res.json({ user: user.toPublicJSON() });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
    });
});

app.put('/api/profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const { displayName, gender, country, interests } = req.body;
        const updates = {};
        if (displayName) updates.displayName = displayName;
        if (gender && ['male', 'female'].includes(gender)) updates.gender = gender;
        if (country) updates.country = country;
        if (interests) updates.interests = interests.slice(0, 10);

        if (isOffline) {
            const user = Array.from(mockUsers.values()).find(u => u.id === req.session.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
            Object.assign(user, updates);
            return res.json({ user: toPublicJSON(user) });
        }

        const user = await User.findByIdAndUpdate(req.session.userId, updates, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: user.toPublicJSON() });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/turn', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
        url: process.env.TURN_URL || '',
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_CREDENTIAL || ''
    });
});

// ── State Management ─────────────────────────────────────────────
const waitingQueue = [];  // Array of { socket, profile, joinedAt }
const socketToRoom = new Map();
const roomToSockets = new Map();
const blockList = new Map();
const socketToProfile = new Map(); // socketId → userProfile

// ── Mock Store for Offline Mode ──────────────────────────────────
const mockUsers = new Map(); // email → userObject
let mockUserIdCounter = 1;

function toPublicJSON(user) {
    return {
        id: user._id || user.id,
        email: user.email,
        displayName: user.displayName,
        gender: user.gender,
        country: user.country,
        interests: user.interests,
        createdAt: user.createdAt || new Date()
    };
}

// ── Helpers ──────────────────────────────────────────────────────
function createRoom(socketA, socketB) {
    const roomName = `room-${socketA.id}-${socketB.id}`;
    socketA.join(roomName);
    socketB.join(roomName);

    socketToRoom.set(socketA.id, roomName);
    socketToRoom.set(socketB.id, roomName);
    roomToSockets.set(roomName, new Set([socketA.id, socketB.id]));

    console.log(`Paired ${socketA.id} and ${socketB.id} in ${roomName}`);
    return roomName;
}

function teardownRoom(socketId) {
    const roomName = socketToRoom.get(socketId);
    if (!roomName) return null;

    const members = roomToSockets.get(roomName);
    if (members) {
        members.forEach(id => {
            socketToRoom.delete(id);
            const s = io.sockets.sockets.get(id);
            if (s) s.leave(roomName);
        });
        roomToSockets.delete(roomName);
    }
    return { roomName, members };
}

function isBlocked(userA, userB) {
    const aBlocks = blockList.get(userA) || new Set();
    const bBlocks = blockList.get(userB) || new Set();
    return aBlocks.has(userB) || bBlocks.has(userA);
}

function getCommonInterests(profileA, profileB) {
    if (!profileA?.interests || !profileB?.interests) return [];
    return profileA.interests.filter(i => profileB.interests.includes(i));
}

function removeFromQueue(socketId) {
    const idx = waitingQueue.findIndex(w => w.socket.id === socketId);
    if (idx !== -1) waitingQueue.splice(idx, 1);
}

function tryPair(socket) {
    const profile = socketToProfile.get(socket.id);

    // Try interest-based match first
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i < waitingQueue.length; i++) {
        const waiting = waitingQueue[i];
        if (waiting.socket.id === socket.id || !waiting.socket.connected) continue;
        if (isBlocked(socket.id, waiting.socket.id)) continue;

        const common = getCommonInterests(profile, waiting.profile);
        if (common.length > bestScore) {
            bestScore = common.length;
            bestMatch = i;
        }
    }

    // If we found a match with shared interests, pair immediately
    if (bestMatch !== null && bestScore > 0) {
        const partner = waitingQueue.splice(bestMatch, 1)[0];
        pairUsers(socket, partner.socket);
        return;
    }

    // If no interest match, check for any available user (random fallback)
    for (let i = 0; i < waitingQueue.length; i++) {
        const waiting = waitingQueue[i];
        if (waiting.socket.id === socket.id || !waiting.socket.connected) continue;
        if (isBlocked(socket.id, waiting.socket.id)) continue;

        // Check if this user has been waiting 5+ seconds (fallback to random)
        const waitTime = Date.now() - waiting.joinedAt;
        if (waitTime >= 5000 || !profile?.interests?.length || !waiting.profile?.interests?.length) {
            waitingQueue.splice(i, 1);
            pairUsers(socket, waiting.socket);
            return;
        }
    }

    // No match found, add to queue
    waitingQueue.push({ socket, profile, joinedAt: Date.now() });
    io.to(socket.id).emit('waiting');
    console.log(`User ${socket.id} is waiting for a match.`);

    // Set a timeout to allow random matching after 5 seconds
    setTimeout(() => {
        // Check if user is still waiting
        const stillWaiting = waitingQueue.find(w => w.socket.id === socket.id);
        if (stillWaiting && stillWaiting.socket.connected) {
            // Try to pair with anyone available
            for (let i = 0; i < waitingQueue.length; i++) {
                const other = waitingQueue[i];
                if (other.socket.id === socket.id || !other.socket.connected) continue;
                if (isBlocked(socket.id, other.socket.id)) continue;

                removeFromQueue(socket.id);
                removeFromQueue(other.socket.id);
                pairUsers(socket, other.socket);
                return;
            }
        }
    }, 5000);
}

function pairUsers(socketA, socketB) {
    const profileA = socketToProfile.get(socketA.id);
    const profileB = socketToProfile.get(socketB.id);
    const commonInterests = getCommonInterests(profileA, profileB);

    createRoom(socketA, socketB);

    io.to(socketA.id).emit('paired', {
        isInitiator: true,
        peerId: socketB.id,
        peerProfile: profileB ? {
            displayName: profileB.displayName,
            gender: profileB.gender,
            country: profileB.country,
            interests: profileB.interests
        } : null,
        commonInterests
    });

    io.to(socketB.id).emit('paired', {
        isInitiator: false,
        peerId: socketA.id,
        peerProfile: profileA ? {
            displayName: profileA.displayName,
            gender: profileA.gender,
            country: profileA.country,
            interests: profileA.interests
        } : null,
        commonInterests
    });
}

// ── Report Logging ───────────────────────────────────────────────
const REPORTS_FILE = path.join(__dirname, 'reports.json');

function logReport(report) {
    let reports = [];
    try {
        if (fs.existsSync(REPORTS_FILE)) {
            reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf-8'));
        }
    } catch (e) { /* ignore parse errors */ }
    reports.push(report);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// ── Socket.io Connection Handler ─────────────────────────────────
function broadcastOnlineCount() {
    const count = io.engine.clientsCount;
    io.emit('online-count', count);
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    broadcastOnlineCount();

    // ── Authenticate socket ──────────────────────────────────────
    socket.on('auth-profile', (profile) => {
        if (profile) {
            socketToProfile.set(socket.id, profile);
            console.log(`User ${socket.id} authenticated as ${profile.displayName}`);
        }
        tryPair(socket);
    });

    // ── WebRTC Signaling ─────────────────────────────────────────
    socket.on('signal', (data) => {
        const roomName = socketToRoom.get(socket.id);
        if (roomName) {
            socket.to(roomName).emit('signal', data);
        }
    });

    // ── Next / Skip ──────────────────────────────────────────────
    socket.on('next', () => {
        console.log(`User ${socket.id} pressed Next`);
        const result = teardownRoom(socket.id);

        if (result && result.members) {
            result.members.forEach(id => {
                if (id !== socket.id) {
                    io.to(id).emit('peer-disconnected', { reason: 'skipped' });
                }
            });
        }

        removeFromQueue(socket.id);
        tryPair(socket);
    });

    // ── Typing Indicator ─────────────────────────────────────────
    socket.on('typing', (isTyping) => {
        const roomName = socketToRoom.get(socket.id);
        if (roomName) {
            socket.to(roomName).emit('typing', isTyping);
        }
    });

    // ── Text Chat ────────────────────────────────────────────────
    socket.on('chat-message', (msg) => {
        const roomName = socketToRoom.get(socket.id);
        if (roomName && typeof msg === 'string' && msg.trim().length > 0) {
            socket.to(roomName).emit('chat-message', {
                text: msg.trim().substring(0, 500),
                senderId: socket.id,
                timestamp: Date.now()
            });
        }
    });

    // ── Report ───────────────────────────────────────────────────
    socket.on('report', (data) => {
        const roomName = socketToRoom.get(socket.id);
        if (!roomName) return;

        const members = roomToSockets.get(roomName);
        let reportedUserId = null;
        if (members) {
            members.forEach(id => {
                if (id !== socket.id) reportedUserId = id;
            });
        }

        const report = {
            reporter: socket.id,
            reported: reportedUserId,
            reason: data.reason || 'unspecified',
            details: (data.details || '').substring(0, 1000),
            timestamp: new Date().toISOString(),
            room: roomName
        };

        logReport(report);
        console.log('Report logged:', report);
        io.to(socket.id).emit('report-confirmed');
    });

    // ── Block ────────────────────────────────────────────────────
    socket.on('block', () => {
        const roomName = socketToRoom.get(socket.id);
        if (!roomName) return;

        const members = roomToSockets.get(roomName);
        if (members) {
            members.forEach(id => {
                if (id !== socket.id) {
                    if (!blockList.has(socket.id)) {
                        blockList.set(socket.id, new Set());
                    }
                    blockList.get(socket.id).add(id);
                    console.log(`User ${socket.id} blocked ${id}`);
                }
            });
        }

        const result = teardownRoom(socket.id);
        if (result && result.members) {
            result.members.forEach(id => {
                if (id !== socket.id) {
                    io.to(id).emit('peer-disconnected', { reason: 'skipped' });
                }
            });
        }
        removeFromQueue(socket.id);
        tryPair(socket);
    });

    // ── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        broadcastOnlineCount();

        removeFromQueue(socket.id);
        socketToProfile.delete(socket.id);

        const result = teardownRoom(socket.id);
        if (result && result.members) {
            result.members.forEach(id => {
                if (id !== socket.id) {
                    io.to(id).emit('peer-disconnected', { reason: 'disconnected' });
                }
            });
        }

        blockList.delete(socket.id);
    });
});

// ── Server Listen & Export ───────────────────────────────────────
const PORT = process.env.PORT || 3000;

// Only start the server manually if we are NOT on Vercel
if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        const protocol = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? 'https' : 'http';
        console.log(`Yoma Chat server running on ${protocol}://localhost:${PORT}`);
    });
}

// Vercel needs the Express app exported, not the HTTP server
module.exports = app;
