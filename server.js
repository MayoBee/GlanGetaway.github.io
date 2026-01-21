const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- IN-MEMORY DATABASE (Reset on server restart) ---
let BOOKINGS = [];
let REPORTS = [];
let CHATS = [];
let USERS = []; // Simple user store

// --- ROUTES ---

// 1. Auth Routes
app.post('/api/auth/register', (req, res) => {
    const { user, pass } = req.body;
    if (USERS.find(u => u.user === user)) {
        return res.status(400).json({ message: "User already exists" });
    }
    USERS.push({ user, pass });
    res.json({ success: true, user });
});

app.post('/api/auth/login', (req, res) => {
    const { user, pass } = req.body;
    const account = USERS.find(u => u.user === user && u.pass === pass);
    if (account) {
        res.json({ success: true, user: account.user });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.post('/api/admin/login', (req, res) => {
    const { user, pass } = req.body;
    // Hardcoded admin credentials from original code
    if (user === 'adnan' && pass === '@dn@n') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// 2. Booking Routes
app.get('/api/bookings', (req, res) => {
    res.json(BOOKINGS);
});

app.post('/api/bookings', (req, res) => {
    const booking = {
        id: Date.now().toString(),
        ...req.body,
        status: req.body.method === 'Cash' ? 'Pending' : 'Paid'
    };
    BOOKINGS.push(booking);
    res.json({ success: true, booking });
});

app.post('/api/bookings/:id/cancel', (req, res) => {
    const booking = BOOKINGS.find(b => b.id === req.params.id);
    if (booking) {
        booking.status = 'Cancelled';
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/bookings/:id/confirm', (req, res) => {
    const booking = BOOKINGS.find(b => b.id === req.params.id);
    if (booking) {
        booking.status = 'Paid';
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 3. Chat Routes
app.get('/api/chat', (req, res) => {
    res.json(CHATS);
});

app.post('/api/chat', (req, res) => {
    const msg = { ...req.body, timestamp: new Date() };
    CHATS.push(msg);
    res.json({ success: true, msg });
});

// 4. Report Routes
app.get('/api/reports', (req, res) => {
    res.json(REPORTS);
});

app.post('/api/reports', (req, res) => {
    const report = { ...req.body, date: new Date().toLocaleDateString() };
    REPORTS.push(report);
    res.json({ success: true });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});