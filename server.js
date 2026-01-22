const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Add this line

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serves your HTML file

// --- DATABASE HELPER FUNCTIONS ---
// We use simple JSON files in a 'data' folder to store information persistently.
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const getFile = (file) => path.join(DATA_DIR, `${file}.json`);

const readData = (file) => {
    if (!fs.existsSync(getFile(file))) return [];
    return JSON.parse(fs.readFileSync(getFile(file), 'utf8'));
};

const writeData = (file, data) => {
    fs.writeFileSync(getFile(file), JSON.stringify(data, null, 2));
};

// --- AUTH ROUTES ---
app.post('/api/auth/signup', (req, res) => {
    const { user, pass } = req.body;
    const users = readData('users');
    if (users.find(u => u.user === user)) return res.status(400).json({ error: 'User exists' });
    users.push({ user, pass });
    writeData('users', users);
    res.json({ success: true, user });
});

app.post('/api/auth/login', (req, res) => {
    const { user, pass } = req.body;
    const users = readData('users');
    // Hardcoded admin check
    if (user === 'adnan' && pass === '@dn@n') return res.json({ success: true, role: 'admin' });
    
    const valid = users.find(u => u.user === user && u.pass === pass);
    if (valid) res.json({ success: true, role: 'guest', user });
    else res.status(401).json({ error: 'Invalid credentials' });
});

// --- BOOKING ROUTES ---
app.get('/api/bookings', (req, res) => {
    res.json(readData('bookings'));
});

app.post('/api/bookings', (req, res) => {
    const bookings = readData('bookings');
    const newBooking = { ...req.body, id: Date.now().toString(), dateCreated: new Date() };
    bookings.push(newBooking);
    writeData('bookings', bookings);
    res.json(newBooking);
});

app.post('/api/bookings/update', (req, res) => {
    const { id, status } = req.body;
    let bookings = readData('bookings');
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
        bookings[index].status = status;
        writeData('bookings', bookings);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Booking not found' });
    }
});

// --- CHAT ROUTES ---
app.get('/api/chat', (req, res) => {
    res.json(readData('chats'));
});

app.post('/api/chat', (req, res) => {
    const chats = readData('chats');
    chats.push(req.body);
    writeData('chats', chats);
    res.json({ success: true });
});

// --- REVIEW ROUTES ---
app.get('/api/reviews', (req, res) => {
    res.json(readData('reviews'));
});

app.post('/api/reviews', (req, res) => {
    const reviews = readData('reviews');
    reviews.unshift(req.body); // Add to top
    writeData('reviews', reviews);
    res.json({ success: true });
});

// --- REPORT ROUTES ---
app.get('/api/reports', (req, res) => {
    res.json(readData('reports'));
});

app.post('/api/reports', (req, res) => {
    const reports = readData('reports');
    reports.push(req.body);
    writeData('reports', reports);
    res.json({ success: true });
});

// Start Server
app.listen(PORT, HOST, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`To access from phone, use your PC's IP address (e.g., http://192.168.1.5:3000)`);
});
