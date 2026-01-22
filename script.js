/**
 * ==========================================================
 * 1. DATA & CONFIGURATION
 * ==========================================================
 */
const TARGET_COORDS = [5.796623590066378, 125.17621205830864];
const API_BASE = '/api'; // Relative path to server

// Accommodation Data
const ACCOMMODATIONS = [
    { id: 'cottage', name: 'Open Cottage', price: 1000, desc: 'Free entrance for 6 pax.', img: 'Open cottage.jpg' },
    { id: 'ahouse_fan', name: 'A-House (Fan)', price: 1500, desc: 'Good for 4-6 pax.', img: '491308916_978933461080029_7076060212183855253_n.jpg' },
    { id: 'ahouse_ac', name: 'A-House (AC)', price: 2000, desc: 'Good for 4-6 pax.', img: '491308916_978933461080029_7076060212183855253_n.jpg' },
    { id: 'barkada_at', name: 'Barkada (At-atoan)', price: 5000, desc: 'Large group package.', img: '491407471_978933601080015_9014631399414983838_n.jpg' },
    { id: 'barkada_dap', name: 'Barkada (Dap-ayan)', price: 10000, desc: 'Premium group package.', img: '491407471_978933601080015_9014631399414983838_n.jpg' }
];

const RESORT_DATA = { 
    name: "MC Jorn Shoreline Beach Resort", 
    location: "Tulan, Taluya, Glan", 
    coords: TARGET_COORDS, 
    mainImage: "frontpage.jpg", 
    description: "Experience the pristine white sands and crystal clear waters of Glan. MC Jorn Shoreline offers a peaceful escape perfect for family reunions.",
    gallery: ["Screenshot 2026-01-19 095754.png", "Screenshot 2026-01-19 155012.png", "Screenshot 2026-01-19 100135.png"],
    features: ["Family Rooms", "Beach Access", "Shoreline View"] 
};

// Global State
let GLOBAL_BOOKINGS = [];
let GLOBAL_REPORTS = [];
let GLOBAL_CHATS = [];
let GLOBAL_REVIEWS = [];
let currentUser = null; 

// --- HELPER FUNCTION FOR FETCH CALLS ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = { 
        method, 
        headers: { 'Content-Type': 'application/json' } 
    };
    if (body) options.body = JSON.stringify(body);
    
    try {
        const res = await fetch(`${API_BASE}/${endpoint}`, options);
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

/**
 * ==========================================================
 * 2. VIEW CONTROLLER
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
    
    async init() {
        this.showCustomer();
        this.updateNav();
        
        // Initial Data Load
        await app.fetchReviews();

        // Report Form Listener
        document.getElementById('report-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const success = await apiCall('reports', 'POST', {
                type: document.getElementById('report-type').value,
                desc: document.getElementById('report-desc').value,
                date: new Date().toLocaleDateString()
            });

            if (success) {
                document.getElementById('report-modal').classList.remove('active');
                showToast("Report Submitted. Thank you!");
                e.target.reset();
            }
        });
    },

    updateNav() {
        const navDiv = document.getElementById('nav-buttons');
        navDiv.innerHTML = ''; 
        if (currentUser) {
            navDiv.innerHTML = `
                <span style="font-weight:600; margin-right:10px;">Hi, ${currentUser.user}</span>
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
 * 3. GUEST AUTH
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
        
        // Matches server endpoints: 'auth/signup' or 'auth/login'
        const endpoint = this.isSignup ? 'auth/signup' : 'auth/login';
        const res = await apiCall(endpoint, 'POST', { user, pass });

        if (res && res.success) {
            showToast(this.isSignup ? "Account Created!" : "Welcome back!");
            this.loginUser(user);
        } else {
            alert(res?.error || "Authentication failed.");
        }
        e.target.reset();
    },
    loginUser(username) { currentUser = { user: username }; viewController.showCustomer(); },
    logout() { currentUser = null; showToast("Logged out."); viewController.showCustomer(); }
};
document.getElementById('guest-auth-form').addEventListener('submit', (e) => guestAuth.handleAuth(e));

/**
 * ==========================================================
 * 4. MAIN APPLICATION LOGIC
 * ==========================================================
 */
class BookingApp {
    constructor() {
        this.resort = RESORT_DATA;
        this.paymentMethod = '';
        this.selectedAccommodation = null;
        this.map = null;
        this.currentGalleryIndex = 0;
        this.currentRating = 0;
        this.renderListing();
        this.renderBookingOptions();
    }

    // --- REVIEWS LOGIC ---
    async fetchReviews() {
        const data = await apiCall('reviews');
        if (data) GLOBAL_REVIEWS = data;
        this.renderListing();
    }

    calculateAvgRating() {
        if (GLOBAL_REVIEWS.length === 0) return "New";
        const total = GLOBAL_REVIEWS.reduce((acc, curr) => acc + curr.rating, 0);
        return (total / GLOBAL_REVIEWS.length).toFixed(1);
    }

    openReviews() {
        document.getElementById('reviews-modal').classList.add('active');
        this.renderReviews();
    }
    closeReviews() { document.getElementById('reviews-modal').classList.remove('active'); }

    setRating(n) {
        this.currentRating = n;
        const stars = document.getElementById('star-input-group').children;
        for(let i=0; i<5; i++) stars[i].classList.toggle('active', i < n);
    }

    async submitReview() {
        if(!currentUser) return alert("Please login to write a review.");
        if(this.currentRating === 0) return alert("Please select a star rating.");
        
        const success = await apiCall('reviews', 'POST', {
            user: currentUser.user,
            rating: this.currentRating,
            comment: document.getElementById('review-comment').value,
            date: new Date().toLocaleDateString()
        });

        if (success) {
            showToast("Review submitted!");
            document.getElementById('review-comment').value = '';
            this.setRating(0);
            await this.fetchReviews();
            this.renderReviews();
        }
    }

    renderReviews() {
        const list = document.getElementById('review-list-container');
        list.innerHTML = GLOBAL_REVIEWS.map(r => `
            <div class="review-item">
                <div class="review-header">
                    <strong>${r.user}</strong>
                    <span style="font-size:0.85rem; color:#888;">${r.date}</span>
                </div>
                <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                <p>${r.comment}</p>
            </div>
        `).join('');
    }

    renderListing() {
        const item = this.resort;
        const avg = this.calculateAvgRating();
        
        document.getElementById('listings-container').innerHTML = `
            <div class="card">
                <div class="card-img" onclick="app.openGallery()">
                    <img src="${item.mainImage}" alt="${item.name}">
                    <div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.6); color:white; padding:5px 10px; border-radius:4px; font-size:0.8rem;">
                        📸 View Gallery
                    </div>
                </div>
                <div class="card-body">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <h3 class="card-title">${item.name}</h3>
                        <div class="rating-badge" onclick="app.openReviews()">⭐ ${avg} (Reviews)</div>
                    </div>
                    <p style="font-weight:600; color:var(--primary); margin-bottom:10px;">📍 ${item.location}</p>
                    <p class="resort-description">${item.description}</p>
                    <div class="card-footer">
                        <div style="font-size:1.1rem; color:var(--text-light);">Rates from <b style="color:var(--secondary);">₱1,000</b></div>
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

    /* --- MAP & GALLERY (Standard) --- */
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

    openGallery() {
        this.currentGalleryIndex = 0;
        this.updateGalleryView();
        document.getElementById('gallery-modal').classList.add('active');
    }
    closeGallery() { document.getElementById('gallery-modal').classList.remove('active'); }
    changeGalleryImage(dir) {
        const total = this.resort.gallery.length;
        this.currentGalleryIndex = (this.currentGalleryIndex + dir + total) % total;
        this.updateGalleryView();
    }
    updateGalleryView() {
        document.getElementById('gallery-active-img').src = this.resort.gallery[this.currentGalleryIndex];
        document.getElementById('gallery-counter').innerText = `${this.currentGalleryIndex + 1} / ${this.resort.gallery.length}`;
    }

    /* --- CHAT --- */
    async openChat() { 
        document.getElementById('chat-modal').classList.add('active'); 
        await this.fetchChats(); 
    }
    closeChat() { document.getElementById('chat-modal').classList.remove('active'); }
    
    async fetchChats() {
        const data = await apiCall('chat');
        if(data) GLOBAL_CHATS = data;
        this.renderChat();
    }
    renderChat() {
        const box = document.getElementById('guest-chat-window');
        box.innerHTML = GLOBAL_CHATS.length ? '' : '<p style="text-align:center; color:#999; margin-top:50px;">Start a conversation!</p>';
        GLOBAL_CHATS.forEach(msg => {
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
        
        await apiCall('chat', 'POST', { sender: 'guest', text: input.value });
        input.value = '';
        await this.fetchChats();
    }

    /* --- BOOKING & CANCELLATION --- */
    openBooking() {
        document.getElementById('booking-modal').classList.add('active');
        const nameInput = document.getElementById('booking-guest-name');
        if(currentUser) { nameInput.value = currentUser.user; nameInput.readOnly = true; } 
        else { nameInput.value = ''; nameInput.readOnly = false; }
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
                <img src="${opt.img}" class="option-thumb" onclick="event.stopPropagation(); app.zoomImage('${opt.img}')">
            </div>
        `).join('');
    }
    selectAccommodation(el, id) {
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedAccommodation = ACCOMMODATIONS.find(a => a.id === id);
        this.calculateTotal();
    }
    calculateTotal() {
        const base = this.selectedAccommodation ? this.selectedAccommodation.price : 0;
        const excessCount = parseInt(document.getElementById('booking-excess').value) || 0;
        const total = base + (excessCount * 100);
        document.getElementById('bill-base').innerText = `₱${base.toLocaleString()}`;
        document.getElementById('bill-excess').innerText = `₱${(excessCount * 100).toLocaleString()}`;
        document.getElementById('bill-total').innerText = `₱${total.toLocaleString()}`;
    }
    selectPayment(el, method) {
        document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.paymentMethod = method;
        const container = document.getElementById('payment-input-container');
        const input = document.getElementById('payment-field');
        container.classList.remove('hidden');
        input.disabled = false; input.value = '';
        if(method === 'GCash') {
            document.getElementById('payment-label').innerText = "Send 50% to: 09357037450 (NEIL S. WADINGAN)";
            input.placeholder = "Enter Ref Number";
        } else {
            document.getElementById('payment-label').innerText = "Note";
            input.value = "Payment collected at front desk.";
            input.disabled = true; 
        }
    }

    async renderGuestBookings() {
        const data = await apiCall('bookings');
        if(!data) return;
        GLOBAL_BOOKINGS = data;
        
        const tbody = document.getElementById('guest-bookings-body');
        const myBookings = GLOBAL_BOOKINGS.filter(b => b.guest === currentUser?.user);
        
        if (myBookings.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No bookings found.</td></tr>'; return; }

        tbody.innerHTML = '';
        myBookings.forEach((b) => {
            const row = document.createElement('tr');
            
            // Allow cancellation unless status is final
            let actionBtn = (b.status !== 'Cancelled' && b.status !== 'Refund Pending' && b.status !== 'Refunded') 
                ? `<button class="btn btn-sm btn-danger" onclick="app.cancelBooking('${b.id}', '${b.method}', '${b.status}')">Cancel</button>`
                : `<span style="color:#aaa;">-</span>`;

            let color = (b.status === 'Paid' || b.status === 'Refunded') ? 'green' : ((b.status === 'Cancelled' || b.status === 'Refund Pending') ? 'red' : '#eab308');

            row.innerHTML = `
                <td>${b.type}</td>
                <td>₱${b.total.toLocaleString()}</td>
                <td>${b.method}</td>
                <td style="font-weight:bold; color:${color}">${b.status}</td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async cancelBooking(bookingId, method, currentStatus) {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        
        // Determine status update based on current payment status
        let newStatus = 'Cancelled';
        if (method === 'GCash' && currentStatus === 'Paid') newStatus = 'Refund Pending';

        // Use the general update endpoint
        const success = await apiCall('bookings/update', 'POST', { id: bookingId, status: newStatus });
        
        if (success) {
            showToast("Booking updated.");
            await this.renderGuestBookings();
        }
    }
}

// --- SUBMIT BOOKING ---
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!app.selectedAccommodation) return alert("Please select an accommodation type.");
    if(!app.paymentMethod) return alert("Please select a payment method.");
    
    const total = parseFloat(document.getElementById('bill-total').innerText.replace('₱', '').replace(',',''));
    const initialStatus = app.paymentMethod === 'Cash' ? 'Pending' : 'Paid';

    const bookingPayload = {
        guest: document.getElementById('booking-guest-name').value,
        type: app.selectedAccommodation.name,
        total: total,
        method: app.paymentMethod,
        status: initialStatus
    };

    const res = await apiCall('bookings', 'POST', bookingPayload);
    if (res) {
        app.closeModal();
        showToast("Booking Submitted!");
        e.target.reset();
    }
});

/**
 * ==========================================================
 * 5. ADMIN LOGIC
 * ==========================================================
 */
class AdminApp {
    constructor() {
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = document.getElementById('admin-user').value;
                const pass = document.getElementById('admin-pass').value;

                // Re-use auth login endpoint, but check for admin role
                const res = await apiCall('auth/login', 'POST', { user, pass });
                if (res && res.role === 'admin') {
                    viewController.showAdmin();
                } else {
                    alert("Invalid Credentials");
                }
            });
        }
    }

    async switchTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        if (window.event && window.event.target) window.event.target.classList.add('active');
        
        ['bookings', 'messages', 'reports'].forEach(id => {
            const el = document.getElementById(`tab-${id}`);
            if(el) el.classList.add('hidden');
        });

        const activeTab = document.getElementById(`tab-${tab}`);
        if(activeTab) activeTab.classList.remove('hidden');
        
        if(tab === 'bookings') await this.renderBookings();
        if(tab === 'messages') await this.fetchAdminMessages();
        if(tab === 'reports') await this.fetchReports();
    }

    async renderBookings() {
        const data = await apiCall('bookings');
        if(data) GLOBAL_BOOKINGS = data;

        const tbody = document.getElementById('admin-bookings-body');
        tbody.innerHTML = GLOBAL_BOOKINGS.length ? '' : '<tr><td colspan="6">No bookings yet.</td></tr>';
        
        GLOBAL_BOOKINGS.forEach(b => {
            const row = document.createElement('tr');
            let color = b.status === 'Paid' ? 'green' : (b.status.includes('Cancelled') || b.status.includes('Refund') ? 'red' : '#eab308');

            let actionHtml = '-';
            // Logic to approve payments or refunds
            if(b.status === 'Pending') {
                actionHtml = `<button class="btn btn-sm btn-success" onclick="adminApp.updateStatus('${b.id}', 'Paid')">Confirm Pay</button>`;
            } else if (b.status === 'Refund Pending') {
                actionHtml = `<button class="btn btn-sm btn-warning" onclick="adminApp.updateStatus('${b.id}', 'Refunded')">Refunded</button>`;
            }

            row.innerHTML = `
                <td>${b.guest}</td>
                <td>${b.type}</td>
                <td>₱${b.total.toLocaleString()}</td>
                <td>${b.method}</td>
                <td style="color:${color}; font-weight:bold;">${b.status}</td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateStatus(id, newStatus) {
        if(confirm(`Update booking status to ${newStatus}?`)) {
            await apiCall('bookings/update', 'POST', { id, status: newStatus });
            showToast("Status updated");
            await this.renderBookings();
        }
    }

    async fetchReports() {
        const data = await apiCall('reports');
        if(data) GLOBAL_REPORTS = data;
        const tbody = document.getElementById('admin-reports-body');
        tbody.innerHTML = GLOBAL_REPORTS.map(r => `<tr><td>${r.type}</td><td>${r.desc}</td><td>${r.date}</td></tr>`).join('') || '<tr><td colspan="3">No reports.</td></tr>';
    }

    async fetchAdminMessages() {
        const data = await apiCall('chat');
        if(data) GLOBAL_CHATS = data;
        this.renderMessages();
    }

    renderMessages() {
        const container = document.getElementById('admin-messages-list');
        const lastMsg = GLOBAL_CHATS.length > 0 ? GLOBAL_CHATS[GLOBAL_CHATS.length - 1] : null;
        container.innerHTML = lastMsg ? `
            <div style="background:#f1f5f9; padding:15px; border-radius:8px;">
                <strong>Latest:</strong> <p>"${lastMsg.text}"</p>
                <input type="text" id="admin-reply-input" placeholder="Type reply..." style="padding:8px; width:70%; margin-top:10px;">
                <button class="btn btn-sm btn-primary" onclick="adminApp.sendReply()">Reply</button>
            </div>` : '<p>No messages.</p>';
    }

    async sendReply() {
        const input = document.getElementById('admin-reply-input');
        if(!input.value.trim()) return;
        
        await apiCall('chat', 'POST', { sender: 'admin', text: input.value });
        showToast("Reply sent.");
        await this.fetchAdminMessages();
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.innerText = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

const app = new BookingApp();
const adminApp = new AdminApp();
viewController.init();
