import { db, addDoc, collection, serverTimestamp } from "./firebase-config.js";

// ... existing DOM selectors ...
const OUT = document.getElementById('wizard-output');
const IN = document.getElementById('wizard-input');

// ... existing STEPS array ...
const STEPS = [
    {
        key: 'name',
        question: "Please identify yourself (Name/Company):",
        placeholder: "e.g. John Doe from Acme Corp"
    },
    {
        key: 'email',
        question: "Enter return transmission frequency (Email Address):",
        placeholder: "name@company.com",
        validate: (val) => /\S+@\S+\.\S+/.test(val) || "Invalid email format. Try again."
    },
    {
        key: 'project_type',
        question: "Select Integration Vector: [1] SAP IDOC  [2] NetSuite  [3] Custom EDI  [4] Other",
        placeholder: "Type 1, 2, 3 or 4...",
        map: { '1': 'SAP IDOC', '2': 'NetSuite', '3': 'Custom EDI', '4': 'Other' }
    },
    {
        key: 'details',
        question: "Briefly describe mission parameters (Project Details):",
        placeholder: "We need an 850/810 integration..."
    }
];

let currentStep = 0;
let answers = {};
let isTyping = false;

document.addEventListener('DOMContentLoaded', () => {
    if (!IN) return;

    setTimeout(() => {
        askQuestion();
    }, 1000);

    IN.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isTyping) {
            handleInput(IN.value.trim());
        }
    });
});

async function typeWriter(text, element) {
    // ... existing typeWriter logic ...
    isTyping = true;
    IN.disabled = true;

    const lines = text.split('\n');

    for (let line of lines) {
        const p = document.createElement('div');
        p.className = 'msg system';
        element.appendChild(p);

        for (let i = 0; i < line.length; i++) {
            p.textContent += line.charAt(i);
            await new Promise(r => setTimeout(r, 20));
            element.scrollTop = element.scrollHeight;
        }
    }

    IN.disabled = false;
    isTyping = false;
    IN.focus();
}

function askQuestion() {
    // ... existing askQuestion logic ...
    const step = STEPS[currentStep];
    typeWriter(step.question, OUT);
    IN.value = '';
    IN.placeholder = step.placeholder;
}

function handleInput(val) {
    if (!val) return;

    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = `> ${val}`;
    OUT.appendChild(div);
    OUT.scrollTop = OUT.scrollHeight;

    const step = STEPS[currentStep];

    if (step.validate) {
        const valid = step.validate(val);
        if (valid !== true) {
            typeWriter(`[ERROR] ${valid}`, OUT);
            return;
        }
    }

    let finalVal = val;
    if (step.map && step.map[val]) {
        finalVal = step.map[val];
        typeWriter(`[SELECTED] ${finalVal}`, OUT);
    }

    answers[step.key] = finalVal;
    currentStep++;

    if (currentStep < STEPS.length) {
        setTimeout(askQuestion, 500);
    } else {
        finishWizard();
    }
}

async function finishWizard() {
    IN.classList.add('hidden');
    await typeWriter("Compiling data packet...", OUT);
    await new Promise(r => setTimeout(r, 800));
    await typeWriter("Saving to secure database...", OUT);

    try {
        await submitToFirestore(answers);
        await typeWriter("Transmission SENT successfully.\nOur architect will decode and respond shortly.\n\n$ Session Closed.", OUT);
    } catch (e) {
        console.error(e);
        await typeWriter("[ERROR] Transmission Failed. Please try again later.", OUT);
    }
}

async function submitToFirestore(data) {
    await addDoc(collection(db, "messages"), {
        ...data,
        timestamp: serverTimestamp(),
        read: false
    });
}
