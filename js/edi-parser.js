/**
 * Lightweight EDI Parser (X12 & EDIFACT)
 */

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('edi-input');
    if (input) {
        input.addEventListener('input', (e) => parseEDI(e.target.value));
    }
});

function loadSample(type) {
    let sample = "";
    if (type === '850') {
        sample = "ISA*00*          *00*          *ZZ*SENDERID       *ZZ*RECEIVERID     *231209*1025*U*00401*000000101*0*P*>~\nGS*PO*SENDERID*RECEIVERID*20231209*1025*101*X*004010~\nST*850*0001~\nBEG*00*NE*PO12345**20231209~\nREF*DP*038~\nN1*ST*SHIP TO NAME*92*123456~\nPO1*1*100*EA*12.50**VP*PART123~\nCTT*1*100~\nSE*8*0001~\nGE*1*101~\nIEA*1*000000101~";
    } else if (type === 'DESADV') {
        sample = "UNA:+.? '\nUNB+UNOC:3+SENDER+RECEIVER+231209:1025+101'\nUNH+0001+DESADV:D:96A:UN'\nBGM+351+DOC123+9'\nDTM+137:20231209:102'\nNAD+BY+BUYERID::92'\nLIN+1++PRODUCT123:IN'\nQTY+12:100:PCE'\nUNT+7+0001'\nUNZ+1+101'";
    }

    const input = document.getElementById('edi-input');
    input.value = sample;
    parseEDI(sample);
}

function parseEDI(raw) {
    if (!raw || raw.trim().length === 0) {
        document.getElementById('edi-output').innerHTML = '<div style="color:var(--text-muted); text-align:center; padding-top:2rem;">Waiting for input stream...</div>';
        document.getElementById('detected-format').textContent = "FORMAT: UNKNOWN";
        return;
    }

    // Detect format and delimiters
    let format = "UNKNOWN";
    let segmentTerminator = "~";
    let elementSeparator = "*";

    // Simple Heuristics
    if (raw.startsWith("ISA") || raw.includes("ISA*")) {
        format = "ANSI X12";
        // Usage: ISA is fixed width. element separator is char 3 (index 3). terminator is char 105 (index 105) usually.
        // But for copy-paste safety, let's look for common patterns.
        if (raw.length > 3) elementSeparator = raw[3];
        // Terminator is trickier if it's newlines. Assume ~ if not found.
        if (raw.includes("~")) segmentTerminator = "~";
        else if (raw.includes("\n") && !raw.includes("~")) segmentTerminator = "\n";
    }
    else if (raw.startsWith("UNA") || raw.startsWith("UNB")) {
        format = "EDIFACT";
        if (raw.startsWith("UNA")) {
            // UNA:+.? '
            // 4th char is sub-element, 5th is element separator (usually +), 
            // 6th is decimal, 7th is escape, 8th is reserved, 9th is terminator (usually ')
            if (raw.length >= 9) {
                elementSeparator = raw[4];
                segmentTerminator = raw[8];
            }
        } else {
            // Default EDIFACT
            elementSeparator = "+";
            segmentTerminator = "'";
        }
    }

    document.getElementById('detected-format').textContent = `FORMAT: ${format}`;

    // Split Segments
    // Clean up newlines if they are just formatting
    let cleanRaw = raw.replace(new RegExp(segmentTerminator + "\\n", "g"), segmentTerminator);

    const segments = cleanRaw.split(segmentTerminator).filter(s => s.trim().length > 0);

    let html = "";

    segments.forEach((seg, index) => {
        let elements = seg.trim().replace(/^\n/, '').split(elementSeparator);
        let segID = elements[0];
        let values = elements.slice(1);

        let elementsHTML = values.map((val, i) => `
            <span class="ele">[${i + 1}]</span><span class="ele-val">"${val}"</span>
        `).join(' ');

        html += `
            <div class="segment-node" title="Segment ${index + 1}">
                <span class="seg-id">${segID}</span>
                ${elementsHTML}
            </div>
        `;
    });

    document.getElementById('edi-output').innerHTML = html;
}
