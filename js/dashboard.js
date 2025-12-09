/**
 * Analytics Dashboard Logic for EDI Hub
 * Integrated with Firebase Authentication & Firestore
 */

import { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

let unsubscribeSnapshot = null; // To stop listener on logout

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
            overlay.classList.add('hidden');
            initRealtimeListener();
            initInboxListener();
        } else {
            console.log('Auth: User logged out');
            overlay.classList.remove('hidden');
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            // Optional: Clear dashboard data for security visuals
        }
    });

    // Login Action
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passInput.value;

        msg.textContent = "Authenticating...";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            msg.textContent = "";
            // onAuthStateChanged will handle the UI update
        } catch (error) {
            console.error("Login failed", error);
            msg.textContent = "Access Denied: Invalid credentials.";
        }
    });

    // Logout Action
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
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
            // Force logout if permission lost
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
    // 1. Calculate Stats
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

    // 3. Render Table
    const tbody = document.getElementById('visits-table-body');
    if (tbody) {
        tbody.innerHTML = '';

        visits.forEach(visit => {
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
        if (msg.project_type === 'SAP IDOC') typeColor = '#f0a500'; // Yellowish
        if (msg.project_type === 'NetSuite') typeColor = '#0070e0'; // Blueish

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
