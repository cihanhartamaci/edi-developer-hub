// Regex Tester Tool
class RegexTester {
    constructor() {
        this.pattern = '';
        this.flags = 'g';
        this.testString = '';
    }

    test() {
        const outputDiv = document.getElementById('regex-output');
        const matchesDiv = document.getElementById('regex-matches');

        try {
            const regex = new RegExp(this.pattern, this.flags);
            const matches = [...this.testString.matchAll(regex)];

            // Highlight matches in text
            let highlightedText = this.testString;
            let offset = 0;

            matches.forEach(match => {
                const matchStart = match.index + offset;
                const matchEnd = matchStart + match[0].length;
                const before = highlightedText.substring(0, matchStart);
                const matchText = highlightedText.substring(matchStart, matchEnd);
                const after = highlightedText.substring(matchEnd);

                highlightedText = before +
                    `<span class="regex-match">${matchText}</span>` +
                    after;
                offset += 31; // Length of span tags
            });

            outputDiv.innerHTML = highlightedText || this.testString;

            // Show match details
            if (matches.length > 0) {
                let matchInfo = `Found ${matches.length} match(es):\n\n`;
                matches.forEach((match, i) => {
                    matchInfo += `Match ${i + 1}: "${match[0]}"\n`;
                    if (match.length > 1) {
                        matchInfo += `Groups: ${match.slice(1).join(', ')}\n`;
                    }
                    matchInfo += `Position: ${match.index}\n\n`;
                });
                matchesDiv.textContent = matchInfo;
            } else {
                matchesDiv.textContent = 'No matches found';
            }

        } catch (error) {
            outputDiv.textContent = this.testString;
            matchesDiv.textContent = `Error: ${error.message}`;
        }
    }
}

let regexTester = new RegexTester();

function testRegex() {
    regexTester.pattern = document.getElementById('regex-pattern').value;
    regexTester.flags = document.getElementById('regex-flags').value;
    regexTester.testString = document.getElementById('regex-test-string').value;
    regexTester.test();
}

function loadRegexPattern(pattern, description) {
    const patterns = {
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        phone: /\+?[\d\s()-]{10,}/g,
        url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
        date: /\d{4}-\d{2}-\d{2}/g,
        edi_segment: /^[A-Z]{2,3}\*/gm
    };

    if (patterns[pattern]) {
        document.getElementById('regex-pattern').value = patterns[pattern].source;
        document.getElementById('regex-flags').value = 'g';
    }
}
