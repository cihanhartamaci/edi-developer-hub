/**
 * Command Palette (CTRL+K) for EDI Hub
 */

const SEARCH_INDEX = [
    { title: "Home", url: "index.html", type: "Page", keywords: "home landing main" },
    { title: "Integration Patterns", url: "patterns.html", type: "Page", keywords: "docs specs x12 edifact" },
    { title: "Technical Insights", url: "insights.html", type: "Page", keywords: "blog articles sap netsuite security" },
    { title: "Expertise & History", url: "expertise.html", type: "Page", keywords: "resume cv work history bio" },
    { title: "Contact", url: "contact.html", type: "Page", keywords: "email hire form message" },
    // Mocking Section Content for Deep Linking
    { title: "ANSI X12 Standard", url: "patterns.html#x12", type: "Pattern", keywords: "850 810 856 us edi" },
    { title: "EDIFACT Global", url: "patterns.html#edifact", type: "Pattern", keywords: "orders desadv invoi un europe" },
    { title: "SAP IDOCs", url: "insights.html#sap", type: "Topic", keywords: "abap idoc we02 we20 ale" },
    { title: "NetSuite SuiteScript", url: "insights.html#netsuite", type: "Topic", keywords: "js api restlet suite" },
    { title: "Dashboard (Private)", url: "dashboard.html", type: "App", keywords: "admin analytics stats login" }
];

document.addEventListener('DOMContentLoaded', () => {
    injectPaletteHTML();
    initPaletteListeners();
});

function injectPaletteHTML() {
    const div = document.createElement('div');
    div.id = 'cmd-palette-overlay';
    div.className = 'cmd-overlay hidden';
    div.innerHTML = `
        <div class="cmd-modal">
            <div class="cmd-header">
                <i class="fas fa-search"></i>
                <input type="text" id="cmd-input" placeholder="Jump to... (Type 'SAP', 'X12', 'Contact')" autocomplete="off">
                <span class="cmd-badge">ESC</span>
            </div>
            <div class="cmd-results" id="cmd-results">
                <!-- Results injected here -->
                <div class="cmd-placeholder">Press <span class="cmd-key">CTRL</span> + <span class="cmd-key">K</span> to open</div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function initPaletteListeners() {
    const overlay = document.getElementById('cmd-palette-overlay');
    const input = document.getElementById('cmd-input');
    const results = document.getElementById('cmd-results');

    // Toggle with CTRL+K or CMD+K
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            togglePalette();
        }
        if (e.key === 'Escape') {
            closePalette();
        }
    });

    // Close on click outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePalette();
    });

    // Search Logic
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length === 0) {
            results.innerHTML = `<div class="cmd-placeholder">Type to search...</div>`;
            return;
        }

        const matches = SEARCH_INDEX.filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.keywords.includes(query)
        ).slice(0, 5); // Limit 5

        renderResults(matches);
    });
}

function renderResults(matches) {
    const container = document.getElementById('cmd-results');
    if (matches.length === 0) {
        container.innerHTML = `<div class="cmd-empty">No matching records found.</div>`;
        return;
    }

    container.innerHTML = matches.map((item, index) => `
        <a href="${item.url}" class="cmd-item" style="animation-delay: ${index * 50}ms">
            <div class="cmd-item-icon">${getIcon(item.type)}</div>
            <div class="cmd-item-info">
                <div class="cmd-item-title">${item.title}</div>
                <div class="cmd-item-type">${item.type}</div>
            </div>
            <i class="fas fa-arrow-right cmd-arrow"></i>
        </a>
    `).join('');
}

function getIcon(type) {
    switch (type) {
        case 'Page': return '<i class="far fa-file"></i>';
        case 'Pattern': return '<i class="fas fa-code-branch"></i>';
        case 'Topic': return '<i class="fas fa-lightbulb"></i>';
        case 'App': return '<i class="fas fa-chart-line"></i>';
        default: return '<i class="fas fa-link"></i>';
    }
}

function togglePalette() {
    const overlay = document.getElementById('cmd-palette-overlay');
    const input = document.getElementById('cmd-input');

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        input.value = '';
        input.focus();
        document.getElementById('cmd-results').innerHTML = `<div class="cmd-placeholder">Start typing...</div>`;
    } else {
        closePalette();
    }
}

function closePalette() {
    document.getElementById('cmd-palette-overlay').classList.add('hidden');
}
