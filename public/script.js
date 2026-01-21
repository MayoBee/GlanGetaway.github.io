/**
 * ==========================================================
 * 1. CONFIGURATION
 * ==========================================================
 */
const TARGET_COORDS = [5.796623590066378, 125.17621205830864];

const ACCOMMODATIONS = [
    { id: 'cottage', name: 'Open Cottage', price: 1000, desc: 'Free entrance for 6 pax. Near shore.', img: 'Open cottage.jpg' },
    { id: 'ahouse_fan', name: 'A-House (Non-Aircon)', price: 1500, desc: 'Good for 4-6 pax.', img: '491308916_978933461080029_7076060212183855253_n.jpg' },
    { id: 'ahouse_ac', name: 'A-House (Aircon)', price: 2000, desc: 'Good for 4-6 pax. Comfortable stay.', img: '491308916_978933461080029_7076060212183855253_n.jpg' },
    { id: 'barkada_at', name: 'Barkada Offer (At-atoan)', price: 5000, desc: 'Great for groups.', img: '491407471_978933601080015_9014631399414983838_n.jpg' },
    { id: 'barkada_dap', name: 'Barkada Offer (Dap-ayan)', price: 10000, desc: 'Premium group experience.', img: '491407471_978933601080015_9014631399414983838_n.jpg' }
];

const RESORT_DATA = { 
    name: "MC Jorn Shoreline Beach Resort", 
    location: "Tulan, Taluya, Glan", 
    coords: TARGET_COORDS, 
    mainImage: "frontpage.jpg", 
    description: "Experience the pristine white sands and crystal clear waters of Glan. MC Jorn Shoreline offers a peaceful escape perfect for family reunions.",
    gallery: [
        "Screenshot 2026-01-19 095754.png", 
        "Screenshot 2026-01-19 155012.png", 
        "Screenshot 2026-01-19 100135.png"
    ],
    features: ["Family Rooms", "Beach Access", "Shoreline View"] 
};

let currentUser = null; 

/**
 * ==========================================================
 * 2. API HELPER
 * ==========================================================
 */
const API = {
    async get(url) {
        const res = await fetch(url);
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    }
};

/**
 * ==========================================================
 * 3. VIEW CONTROLLER
 * ==========================================================
 */
const viewController = {
    views: {
        customer: document.getElementById('view-customer'),
        login: document.getElementById('view-login'), 
        admin: document.getElementById('view-admin'),
        guestAuth: document.getElementById('view-guest-auth'),
        guestBookings: document.getElementById('view-guest-bookings')
    },
    
    init() {
        this.showCustomer();
        this.updateNav();
        // Initialize Report Form
        document.getElementById('report-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                type: document.getElementById('report-type').value,
                desc: document.getElementById('report-desc').value
            };
            await API.post('/api/reports', data);
            document.getElementById('report-modal').classList.remove('active');
            showToast("Report Submitted. Thank you!");
            e.target.reset();
        });
    },

    updateNav() {
        const navDiv = document.getElementById('nav-buttons');
        navDiv.innerHTML = ''; 

        if (currentUser) {
            navDiv.innerHTML = `
                <span style="font-weight:600; margin-right:10px; display:none; @media(min-width:600px){display:inline;}">Hi, ${currentUser.user}</span>
                <button class="btn btn-outline btn-sm" onclick="viewController.showGuestBookings()">My Bookings</button>
                <button class="btn btn-primary btn-sm" onclick="guestAuth.logout()">Logout</button>
            `;
        } else {
            navDiv.innerHTML = `
                <button class="btn btn-outline btn-sm" onclick="viewController.showGuestAuth()">Guest Login</button>
                <button class="btn btn-primary btn-sm" onclick="viewController.showAdminLogin()">Admin</button>
            `;
        }
    },

    showCustomer() { this.hideAll(); this.views.customer.classList.remove('hidden'); this.updateNav(); },
    showAdminLogin() { this.hideAll(); this.views.login.classList.remove('hidden'); },
    showGuestAuth() { this.hideAll(); this.views.guestAuth.classList.remove('hidden'); },
    showGuestBookings() { this.hideAll(); this.views.guestBookings.classList.remove('hidden'); app.renderGuestBookings(); },
    showAdmin() {
        this.hideAll();
        this.views.admin.classList.remove('hidden');
        document.getElementById('nav-buttons').innerHTML = `<button class="btn btn-danger btn-sm" onclick="viewController.showCustomer()">Sign Out</button>`;
        adminApp.switchTab('bookings');
    },
    hideAll() { Object.values(this.views).forEach(el => el.classList.add('hidden')); }
};

/**
 * ==========================================================
 * 4. GUEST AUTHENTICATION
 * ==========================================================
 */
const guestAuth = {
    isSignup: false, 
    toggleMode() {
        this.isSignup = !this.isSignup;
        document.getElementById('auth-title').innerText = this.isSignup ? "Create Account" : "Guest Login";
        document.getElementById('auth-btn-submit').innerText = this.isSignup ? "Sign Up" : "Login";
        document.getElementById('auth-toggle-text').innerText = this.isSignup ? "Already have an account?" : "New here?";
    },
    async handleAuth(e) {
        e.preventDefault();
        const user = document.getElementById('guest-user').value;
        const pass = document.getElementById('guest-pass').value;

        const endpoint = this.isSignup ? '/api/auth/register' : '/api/auth/login';
        const res = await API.post(endpoint, { user, pass });

        if (res.success) {
            this.loginUser(res.user);
            showToast(this.isSignup ? "Account Created!" : "Welcome back!");
        } else {
            alert(res.message || "Authentication Failed.");
        }
        e.target.reset();
    },
    loginUser(username) {
        currentUser = { user: username };
        viewController.showCustomer(); 
    },
    logout() {
        currentUser = null;
        showToast("Logged out successfully.");
        viewController.showCustomer();
    }
};

document.getElementById('guest-auth-form').addEventListener('submit', (e) => guestAuth.handleAuth(e));

/**
 * ==========================================================
 * 5. MAIN APPLICATION LOGIC
 * ==========================================================
 */
class BookingApp {
    constructor() {
        this.resort = RESORT_DATA;
        this.paymentMethod = '';
        this.selectedAccommodation = null;
        this.map = null;
        this.currentGalleryIndex = 0;
        
        this.renderListing();
        this.renderBookingOptions();
    }

    renderListing() {
        const item = this.resort;
        document.getElementById('listings-container').innerHTML = `
            <div class="card">
                <div class="card-img" onclick="app.openGallery()">
                    <img src="${item.mainImage}" alt="${item.name}">
                    <div class="card-img-badge">📸 View Gallery</div>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${item.name}</h3>
                    <p class="resort-location">📍 ${item.location}</p>
                    <p class="resort-description">${item.description}</p>
                    <div class="resort-features">
                        ${item.features.map(f => `<span>${f}</span>`).join('')}
                    </div>
                    <div class="card-footer">
                        <div class="card-price">Rates from <b>₱1,000</b></div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-outline btn-sm" onclick="app.openMap()">📍 Map</button>
                            <button class="btn btn-outline btn-sm" onclick="app.openChat()">💬 Chat</button>
                            <button class="btn btn-primary btn-sm" onclick="app.openBooking()">Book Now</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* --- MAP --- */
    openMap() {
        document.getElementById('map-modal').classList.add('active');
        if(this.map) this.map.remove(); 
        setTimeout(() => {
            this.map = L.map('map').setView(this.resort.coords, 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
            L.marker(this.resort.coords).addTo(this.map).bindPopup(`<b>${this.resort.name}</b>`).openPopup();
        }, 100);
    }
    closeMap() { document.getElementById('map-modal').classList.remove('active'); }
    getDirections() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const url = `https://www.google.com/maps/dir/${pos.coords.latitude},${pos.coords.longitude}/${TARGET_COORDS[0]},${TARGET_COORDS[1]}`;
                    window.open(url, '_blank');
                },
                () => { window.open(`https://www.google.com/maps/search/?api=1&query=${TARGET_COORDS[0]},${TARGET_COORDS[1]}`, '_blank'); }
            );
        } else { alert("Geolocation not supported."); }
    }

    /* --- GALLERY --- */
    openGallery() {
        this.currentGalleryIndex = 0;
        this.updateGalleryView();
        document.getElementById('gallery-modal').classList.add('active');
        document.addEventListener('keydown', this.galleryKeyHandler);
    }
    closeGallery() { 
        document.getElementById('gallery-modal').classList.remove('active'); 
        document.removeEventListener('keydown', this.galleryKeyHandler);
    }
    galleryKeyHandler(e) {
        if(e.key === 'ArrowLeft') app.changeGalleryImage(-1);
        if(e.key === 'ArrowRight') app.changeGalleryImage(1);
        if(e.key === 'Escape') app.closeGallery();
    }
    changeGalleryImage(direction) {
        const total = this.resort.gallery.length;
        this.currentGalleryIndex = (this.currentGalleryIndex + direction + total) % total;
        this.updateGalleryView();
    }
    updateGalleryView() {
        document.getElementById('gallery-active-img').src = this.resort.gallery[this.currentGalleryIndex];
        document.getElementById('gallery-counter').innerText = `${this.currentGalleryIndex + 1} / ${this.resort.gallery.length}`;
    }

    /* --- CHAT --- */
    openChat() { 
        document.getElementById('chat-modal').classList.add('active'); 
        this.loadChat();
    }
    closeChat() { document.getElementById('chat-modal').classList.remove('active'); }

    async loadChat() {
        const chats = await API.get('/api/chat');
        const box = document.getElementById('guest-chat-window');
        box.innerHTML = chats.length ? '' : '<p style="text-align:center; color:#999; margin-top:50px;">Start a conversation with us!</p>';
        chats.forEach(msg => {
            const div = document.createElement('div');
            div.className = `chat-msg ${msg.sender}`;
            div.innerText = msg.text;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    }

    async sendGuestMessage() {
        const input = document.getElementById('guest-chat-input');
        if(!input.value.trim()) return;
        await API.post('/api/chat', { sender: 'guest', text: input.value });
        input.value = '';
        this.loadChat();
    }

    /* --- BOOKING --- */
    openBooking() {
        document.getElementById('booking-modal').classList.add('active');
        const nameInput = document.getElementById('booking-guest-name');
        if(currentUser) {
            nameInput.value = currentUser.user;
            nameInput.readOnly = true; 
        } else {
            nameInput.value = '';
            nameInput.readOnly = false;
        }
        this.selectedAccommodation = null;
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        this.calculateTotal();
    }
    closeModal() { document.getElementById('booking-modal').classList.remove('active'); }

    renderBookingOptions() {
        const container = document.getElementById('booking-options-container');
        container.innerHTML = ACCOMMODATIONS.map(opt => `
            <div class="option-card" onclick="app.selectAccommodation(this, '${opt.id}')">
                <div>
                    <div style="font-weight:bold;">${opt.name}</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">${opt.desc}</div>
                    <div style="color:var(--primary); font-weight:700;">₱${opt.price.toLocaleString()}</div>
                </div>
                <img src="${opt.img}" class="option-thumb" onclick="event.stopPropagation(); app.zoomImage('${opt.img}')" title="Click to enlarge">
            </div>
        `).join('');
    }

    selectAccommodation(el, id) {
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedAccommodation = ACCOMMODATIONS.find(a => a.id === id);
        this.calculateTotal();
    }

    zoomImage(src) {
        document.getElementById('zoomed-image').src = src;
        document.getElementById('zoom-modal').classList.add('active');
    }

    calculateTotal() {
        const base = this.selectedAccommodation ? this.selectedAccommodation.price : 0;
        const excessCount = parseInt(document.getElementById('booking-excess').value) || 0;
        const excessCost = excessCount * 100;
        const isWeekend = [0, 6].includes(new Date().getDay());
        let discount = (!isWeekend && base > 0) ? base * 0.15 : 0;
        const total = base + excessCost - discount;

        document.getElementById('bill-base').innerText = `₱${base.toLocaleString()}`;
        document.getElementById('bill-excess').innerText = `₱${excessCost.toLocaleString()}`;
        document.getElementById('bill-discount').innerText = discount > 0 ? `-₱${discount.toLocaleString()}` : "₱0";
        document.getElementById('bill-total').innerText = `₱${total.toLocaleString()}`;
    }

    selectPayment(el, method) {
        document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.paymentMethod = method;

        const container = document.getElementById('payment-input-container');
        const label = document.getElementById('payment-label');
        const input = document.getElementById('payment-field');

        container.classList.remove('hidden');
        input.disabled = false;
        input.value = '';

        if(method === 'GCash') {
            label.innerText = "Send 50% to: 09357037450 (NEIL S. WADINGAN)";
            input.placeholder = "Enter Ref Number";
        } else {
            label.innerText = "Note";
            input.value = "Payment will be collected at the front desk upon arrival.";
            input.disabled = true; 
        }
    }

    async renderGuestBookings() {
        const tbody = document.getElementById('guest-bookings-body');
        const allBookings = await API.get('/api/bookings');
        const myBookings = allBookings.filter(b => b.guest === currentUser.user);
        
        if (myBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No bookings found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        myBookings.forEach((b) => {
            const row = document.createElement('tr');
            const actionBtn = b.status !== 'Cancelled' 
                ? `<button class="btn btn-sm btn-danger" onclick="app.cancelBooking('${b.id}')">Cancel</button>` 
                : `<span style="color:#aaa;">-</span>`;
            
            let statusColor = b.status === 'Paid' ? 'green' : (b.status === 'Cancelled' ? 'red' : '#eab308');

            row.innerHTML = `
                <td>${b.type}</td>
                <td>Today</td>
                <td>₱${b.total.toLocaleString()}</td>
                <td style="font-weight:bold; color:${statusColor}">${b.status}</td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async cancelBooking(bookingId) {
        if (confirm("Are you sure you want to cancel this booking?")) {
            await API.post(`/api/bookings/${bookingId}/cancel`, {});
            showToast("Booking Cancelled.");
            this.renderGuestBookings(); 
        }
    }
}

// --- BOOKING SUBMISSION HANDLER ---
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!app.selectedAccommodation) return alert("Please select an accommodation type.");
    if(!app.paymentMethod) return alert("Please select a payment method.");
    
    const totalText = document.getElementById('bill-total').innerText.replace('₱', '').replace(',','');
    const total = parseFloat(totalText);

    const data = {
        guest: document.getElementById('booking-guest-name').value,
        type: app.selectedAccommodation.name,
        total: total,
        method: app.paymentMethod,
        details: document.getElementById('payment-field').value,
    };

    const res = await API.post('/api/bookings', data);
    
    app.closeModal();
    const msg = res.booking.status === 'Pending' ? "Booking Confirmed! Pay on Arrival." : "Booking Submitted! Waiting for confirmation.";
    showToast(msg);
    e.target.reset();
});

/**
 * ==========================================================
 * 6. ADMIN APPLICATION LOGIC
 * ==========================================================
 */
class AdminApp {
    constructor() {
        document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-user').value;
            const pass = document.getElementById('admin-pass').value;

            const res = await API.post('/api/admin/login', { user, pass });
            if (res.success) {
                viewController.showAdmin();
            } else {
                alert("Invalid Login.");
            }
        });
    }

    switchTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        ['bookings', 'messages', 'reports'].forEach(id => {
            document.getElementById(`tab-${id}`).classList.add('hidden');
        });
        document.getElementById(`tab-${tab}`).classList.remove('hidden');

        if(tab === 'bookings') this.renderBookings();
        if(tab === 'messages') this.renderMessages();
        if(tab === 'reports') this.renderReports();
    }

    async renderBookings() {
        const bookings = await API.get('/api/bookings');
        const tbody = document.getElementById('admin-bookings-body');
        tbody.innerHTML = bookings.length ? '' : '<tr><td colspan="6">No bookings yet.</td></tr>';
        
        bookings.forEach(b => {
            const row = document.createElement('tr');
            let statusColor = b.status === 'Paid' ? 'green' : (b.status === 'Cancelled' ? 'red' : '#eab308');

            let actionHtml = '-';
            if(b.status === 'Pending') {
                actionHtml = `<button class="btn btn-sm btn-success" onclick="adminApp.confirmPayment('${b.id}')">Confirm Payment</button>`;
            } else if (b.status === 'Paid') {
                actionHtml = `<span style="color:green">✓ Completed</span>`;
            }

            row.innerHTML = `
                <td>${b.guest}</td>
                <td>${b.type}</td>
                <td>₱${b.total.toLocaleString()}</td>
                <td>${b.method}</td>
                <td style="color:${statusColor}; font-weight:bold;">${b.status}</td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async confirmPayment(bookingId) {
        if(confirm(`Confirm payment?`)) {
            await API.post(`/api/bookings/${bookingId}/confirm`, {});
            showToast("Payment Confirmed.");
            this.renderBookings();
        }
    }

    async renderReports() {
        const reports = await API.get('/api/reports');
        const tbody = document.getElementById('admin-reports-body');
        tbody.innerHTML = reports.length ? '' : '<tr><td colspan="3">No reports yet.</td></tr>';
        reports.forEach(r => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${r.type}</td><td>${r.desc}</td><td>${r.date}</td>`;
            tbody.appendChild(row);
        });
    }

    async renderMessages() {
        const chats = await API.get('/api/chat');
        const container = document.getElementById('admin-messages-list');
        const lastMsg = chats.length > 0 ? chats[chats.length - 1] : null;
        
        if(!lastMsg) {
            container.innerHTML = '<p>No messages yet.</p>';
            return;
        }

        container.innerHTML = `
            <div style="background:#f1f5f9; padding:15px; border-radius:8px;">
                <strong>Latest Message (${lastMsg.sender}):</strong>
                <p style="margin:5px 0;">"${lastMsg.text}"</p>
                <div style="margin-top:10px;">
                    <input type="text" id="admin-reply-input" placeholder="Type reply..." style="padding:8px; width:70%;">
                    <button class="btn btn-sm btn-primary" onclick="adminApp.sendReply()">Reply</button>
                </div>
            </div>
        `;
    }

    async sendReply() {
        const input = document.getElementById('admin-reply-input');
        if(!input.value.trim()) return;
        await API.post('/api/chat', { sender: 'admin', text: input.value });
        showToast("Reply sent to guest.");
        this.renderMessages();
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// --- INITIALIZATION ---
const app = new BookingApp();
const adminApp = new AdminApp();
viewController.init();