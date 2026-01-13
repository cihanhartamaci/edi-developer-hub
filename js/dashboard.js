/**
 * Analytics Dashboard Logic for EDI Hub
 * Integrated with Firebase Authentication & Firestore
 */

import { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

let unsubscribeVisits = null; // To stop visits listener on logout
let unsubscribeInbox = null;  // To stop messages listener on logout


// Filter State
let currentFilter = 'all'; // 'today', 'week', 'all', 'custom' - default to 'all'
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
            // Show user identity
            const identity = document.getElementById('user-identity');
            const userEmail = document.getElementById('user-email');
            if (identity && userEmail) {
                userEmail.textContent = user.email;
                identity.style.display = 'block';
            }
            initRealtimeListener();
            initInboxListener();
            initFilterControls();
        } else {
            console.log('Auth: User logged out');
            overlay.style.display = 'flex';
            // Hide user identity
            const identity = document.getElementById('user-identity');
            if (identity) identity.style.display = 'none';

            // Clean up listeners
            if (unsubscribeVisits) {
                console.log("Auth: Unsubscribing from Visits...");
                unsubscribeVisits();
                unsubscribeVisits = null;
            }
            if (unsubscribeInbox) {
                console.log("Auth: Unsubscribing from Inbox...");
                unsubscribeInbox();
                unsubscribeInbox = null;
            }
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

    unsubscribeVisits = onSnapshot(q, (snapshot) => {
        const visits = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            visits.push({ ...data, timestamp: date });
        });

        updateDashboard(visits);
    }, (error) => {
        console.error("Firestore (Visits) Error:", error);
        if (error.code === 'permission-denied') {
            const msg = document.getElementById('login-msg');
            msg.textContent = "Access Denied: Your account does not have permission to view this data.";
            console.warn("Permission denied for visits. Logging out...");
            // Optionally sign out if they shouldn't even be on this page
            setTimeout(() => signOut(auth), 3000);
        }
    });
}

function initInboxListener() {
    console.log("Dashboard: Connecting to Firestore Messages...");
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));

    unsubscribeInbox = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            messages.push({ ...data, id: doc.id, timestamp: date });
        });
        updateInbox(messages);
    }, (error) => {
        console.error("Firestore (Messages) Error:", error);
        if (error.code === 'permission-denied') {
            console.warn("Permission denied for messages.");
        }
    });
}


function updateDashboard(visits) {
    try {
        console.log('updateDashboard called with', visits ? visits.length : 0, 'visits');

        // Safety check
        if (!visits || !Array.isArray(visits)) {
            console.error('Invalid visits data');
            return;
        }

        // Store all visits for filtering
        allVisits = visits;

        // Apply current filter
        console.log('Current filter:', currentFilter);
        const filteredVisits = applyDateFilter(visits);
        console.log('Filtered visits:', filteredVisits ? filteredVisits.length : 0);

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

        // 3. Render Table (use filtered visits)
        const tbody = document.getElementById('visits-table-body');
        if (tbody) {
            tbody.innerHTML = '';

            if (!filteredVisits || filteredVisits.length === 0) {
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
    } catch (error) {
        console.error('Error in updateDashboard:', error);
        // Show error message to user
        const tbody = document.getElementById('visits-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #ff6b6b;"><i class="fas fa-exclamation-triangle"></i><br>Error loading dashboard: ' + error.message + '</td></tr>';
        }
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
        if (allVisits && allVisits.length > 0) {
            updateDashboard(allVisits);
        }
    });

    weekBtn.addEventListener('click', () => {
        currentFilter = 'week';
        updateFilterButtons();
        if (allVisits && allVisits.length > 0) {
            updateDashboard(allVisits);
        }
    });

    allBtn.addEventListener('click', () => {
        currentFilter = 'all';
        updateFilterButtons();
        if (allVisits && allVisits.length > 0) {
            updateDashboard(allVisits);
        }
    });

    // Custom date range
    applyBtn.addEventListener('click', () => {
        const start = startInput.value;
        const end = endInput.value;

        if (!start || !end) {
            alert('Please select both start and end dates');
            return;
        }

        // Parse dates in local timezone (not UTC)
        // Input format is "YYYY-MM-DD", we need to parse it as local time
        const [startYear, startMonth, startDay] = start.split('-').map(Number);
        const [endYear, endMonth, endDay] = end.split('-').map(Number);

        customStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        customEndDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        if (customStartDate > customEndDate) {
            alert('Start date must be before end date');
            return;
        }

        currentFilter = 'custom';
        updateFilterButtons();
        if (allVisits && allVisits.length > 0) {
            updateDashboard(allVisits);
        }
    });

    // Set default filter to all time (already set in state, just update UI)
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
    try {
        // Safety check
        if (!visits || !Array.isArray(visits)) {
            console.error('applyDateFilter: Invalid visits array');
            return [];
        }

        if (currentFilter === 'all') {
            return visits;
        }

        const now = new Date();
        let startDate;

        if (currentFilter === 'today') {
            // From midnight today (local time) until now
            const today = new Date();
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            console.log('Today filter - start date:', startDate.toLocaleString());
        } else if (currentFilter === 'week') {
            // Last 7 days
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (currentFilter === 'custom') {
            // Custom range
            if (!customStartDate || !customEndDate) {
                console.warn('Custom filter selected but dates not set');
                return visits;
            }
            return visits.filter(visit => {
                if (!visit || !visit.timestamp) return false;
                const visitDate = visit.timestamp;
                return visitDate >= customStartDate && visitDate <= customEndDate;
            });
        }

        return visits.filter(visit => {
            if (!visit || !visit.timestamp) return false;
            return visit.timestamp >= startDate;
        });
    } catch (error) {
        console.error('Error in applyDateFilter:', error);
        // On error, return all visits unfiltered
        return visits || [];
    }
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
