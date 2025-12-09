/**
 * Analytics Dashboard Logic for EDI Hub
 * Integrated with Firebase Authentication & Firestore
 */

const passInput = document.getElementById('password');
const msg = document.getElementById('login-msg');

// Monitor Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Auth: User logged in', user.email);
        overlay.classList.add('hidden');
        initRealtimeListener();
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
