/**
 * Typewriter Effect for Hero Section
 */

const phrases = [
    "> INITIALIZING SYSTEM...",
    "> CONNECTING NODES...",
    "> LOADING INTEGRATION PATTERNS...",
    "> SYSTEM READY."
];

let partIndex = 0;
let phraseIndex = 0;
let offset = 0;
let forwards = true;
let skipCount = 0;
const skipDelay = 15;
const speed = 70;

const targetElement = document.getElementById('typing-text');

const cursor = document.createElement('span');
cursor.className = 'typing-cursor';
cursor.textContent = '_';

if (targetElement) {
    targetElement.appendChild(cursor);
    setInterval(wordFlick, speed);
}

function wordFlick() {
    if (!targetElement) return;

    if (forwards) {
        if (offset >= phrases[phraseIndex].length) {
            ++skipCount;
            if (skipCount == skipDelay) {
                forwards = false;
                skipCount = 0;
            }
        }
    } else {
        if (offset == 0) {
            forwards = true;
            phraseIndex++;
            if (phraseIndex >= phrases.length) {
                phraseIndex = 0;
            }
        }
    }

    const part = phrases[phraseIndex].substr(0, offset);

    if (skipCount == 0) {
        if (forwards) {
            offset++;
        } else {
            // offset--; // Uncomment to delete text back
            // For this specific design, we might want it to stay or just clear. 
            // Let's make it clear after a pause for the loop effect, or just stop at the last one if we want "Boot up" feel.
            // But standard loop is usually safer for engagement.

            // Actually, let's just loop:
            offset--;
        }
    }

    // Special case for the last "READY" state - maybe pause longer or stop?
    // For now, infinite loop is dynamic.

    targetElement.textContent = part;
    targetElement.appendChild(cursor);
}
