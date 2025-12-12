/**
 * Analytics Dashboard Logic for EDI Hub
 * Integrated with Firebase Authentication & Firestore
 */

import { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

let unsubscribeSnapshot = null; // To stop listener on logout

// Filter State
let currentFilter = 'today'; // 'today', 'week', 'all', 'custom'
let customStartDate = null;
let customEndDate = null;
let allVisits = []; // Store all visits for filtering

function initAuth() {
    const overlay = document.getElementById('auth-overlay');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const msg = document.getElementById('login-msg');

    // Monitor Auth State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Auth: User logged in', user.email);
            overlay.style.display = 'none';
            initRealtimeListener();
            initInboxListener();
            initFilterControls();
        } else {
            console.log('Auth: User logged out');
            overlay.style.display = 'flex';
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        }
    });

    // Login Action (Click)
    loginBtn.addEventListener('click', () => performLogin());

    // Login Action (Enter Key)
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performLogin();
    });

    async function performLogin() {
        const email = emailInput.value;
        const password = passInput.value;

        if (!email || !password) {
            msg.textContent = "Please enter both email and password.";
            return;
        }

        msg.textContent = "Authenticating...";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            msg.textContent = "";
            // onAuthStateChanged will handle the UI
        } catch (error) {
            console.error("Login failed", error);
            msg.textContent = "Access Denied: Invalid credentials.";
        }
    }

    // Logout Action - FIXED: Redirects to home
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            // Redirect to home page after logout
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout failed", error);
        }
    });
}

function initRealtimeListener() {
    console.log("Dashboard: Connecting to Firestore Visits...");
    const q = query(collection(db, "visits"), orderBy("timestamp", "desc"), limit(100));

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const visits = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            visits.push({ ...data, timestamp: date });
        });

        updateDashboard(visits);
    }, (error) => {
        console.error("Firestore Error:", error);
        if (error.code === 'permission-denied') {
            document.getElementById('login-msg').textContent = "Session expired. Please login again.";
            signOut(auth);
        }
    });
}

function initInboxListener() {
    console.log("Dashboard: Connecting to Firestore Messages...");
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));

    onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            messages.push({ ...data, id: doc.id, timestamp: date });
        });
        updateInbox(messages);
    });
}

function updateDashboard(visits) {
    // Store all visits for filtering
    allVisits = visits;

    // Apply current filter
    const filteredVisits = applyDateFilter(visits);

    // 1. Calculate Stats (use all visits, not filtered)
    document.getElementById('total-visits').textContent = visits.length + "+";

    const uniqueIPs = new Set(visits.map(v => v.ip)).size;

    // Top Country
    const countries = {};
    visits.forEach(v => {
        const c = v.location.split(',')[1]?.trim() || 'Unknown';
        countries[c] = (countries[c] || 0) + 1;
    });
    const topCountry = Object.keys(countries).sort((a, b) => countries[b] - countries[a])[0] || '-';

    // Last Active
    let lastActive = '-';
    if (visits.length > 0) {
        lastActive = timeAgo(visits[0].timestamp);
    }

    // 2. Update DOM
    document.getElementById('unique-visitors').textContent = uniqueIPs;
    document.getElementById('top-country').textContent = topCountry;
    document.getElementById('last-active').textContent = lastActive;

    // Update filter count
    document.getElementById('filtered-count').textContent = filteredVisits.length;

    // 3. Render Table (use filtered visits)
    const tbody = document.getElementById('visits-table-body');
    if (tbody) {
        tbody.innerHTML = '';

        if (filteredVisits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fas fa-filter" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i><br>No visits match the selected filter</td></tr>';
            return;
        }

        filteredVisits.forEach(visit => {
            const row = document.createElement('tr');
            const dateStr = visit.timestamp.toLocaleString();

            const pageName = visit.page === '/' || visit.page === '/index.html' ? 'Home' : visit.page.replace(/^\//, '');

            row.innerHTML = `
                <td><div class="status-dot"></div>${dateStr}</td>
                <td>${visit.location}</td>
                <td class="mono-text">${visit.ip}</td>
                <td>${pageName}</td>
                <td>${visit.device || 'Desktop'}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function updateInbox(messages) {
    const tbody = document.getElementById('inbox-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No messages yet.</td></tr>';
        return;
    }

    messages.forEach(msg => {
        const row = document.createElement('tr');
        const dateStr = msg.timestamp.toLocaleDateString() + ' ' + msg.timestamp.toLocaleTimeString();

        // Project Type color
        let typeColor = 'var(--text-main)';
        if (msg.project_type === 'SAP IDOC') typeColor = '#f0a500';
        if (msg.project_type === 'NetSuite') typeColor = '#0070e0';

        row.innerHTML = `
            <td style="font-size: 0.8em; color: var(--text-muted);">${dateStr}</td>
            <td>
                <div style="font-weight:bold;">${msg.name || 'Anonymous'}</div>
                <div style="font-size:0.8em; color: var(--text-muted);">${msg.email}</div>
            </td>
            <td style="color:${typeColor}; font-weight:500;">${msg.project_type}</td>
            <td>${msg.details || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize Filter Controls
function initFilterControls() {
    const todayBtn = document.getElementById('filter-today');
    const weekBtn = document.getElementById('filter-week');
    const allBtn = document.getElementById('filter-all');
    const applyBtn = document.getElementById('apply-custom');
    const startInput = document.getElementById('date-start');
    const endInput = document.getElementById('date-end');

    // Quick filter buttons
    todayBtn.addEventListener('click', () => {
        currentFilter = 'today';
        updateFilterButtons();
        updateDashboard(allVisits);
    });

    weekBtn.addEventListener('click', () => {
        currentFilter = 'week';
        updateFilterButtons();
        updateDashboard(allVisits);
    });

    allBtn.addEventListener('click', () => {
        currentFilter = 'all';
        updateFilterButtons();
        updateDashboard(allVisits);
    });

    // Custom date range
    applyBtn.addEventListener('click', () => {
        const start = startInput.value;
        const end = endInput.value;

        if (!start || !end) {
            alert('Please select both start and end dates');
            return;
        }

        customStartDate = new Date(start);
        customEndDate = new Date(end);
        customEndDate.setHours(23, 59, 59, 999); // Include full end day

        if (customStartDate > customEndDate) {
            alert('Start date must be before end date');
            return;
        }

        currentFilter = 'custom';
        updateFilterButtons();
        updateDashboard(allVisits);
    });

    // Set default filter to today
    currentFilter = 'today';
    updateFilterButtons();
}

// Update filter button active states
function updateFilterButtons() {
    const buttons = {
        'today': document.getElementById('filter-today'),
        'week': document.getElementById('filter-week'),
        'all': document.getElementById('filter-all'),
        'custom': document.getElementById('apply-custom')
    };

    Object.keys(buttons).forEach(key => {
        if (buttons[key]) {
            buttons[key].classList.remove('active');
        }
    });

    if (buttons[currentFilter]) {
        buttons[currentFilter].classList.add('active');
    }
}

// Apply date filter to visits
function applyDateFilter(visits) {
    if (currentFilter === 'all') {
        return visits;
    }

    const now = new Date();
    let startDate;

    if (currentFilter === 'today') {
        // Last 24 hours
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (currentFilter === 'week') {
        // Last 7 days
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (currentFilter === 'custom') {
        // Custom range
        if (!customStartDate || !customEndDate) {
            return visits;
        }
        return visits.filter(visit => {
            const visitDate = visit.timestamp;
            return visitDate >= customStartDate && visitDate <= customEndDate;
        });
    }

    return visits.filter(visit => visit.timestamp >= startDate);
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}
