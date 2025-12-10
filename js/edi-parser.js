/**
 * Lightweight EDI Parser (X12 & EDIFACT)
 */

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('edi-input');
    if (input) {
        input.addEventListener('input', (e) => parseEDI(e.target.value));
    }
});

let isHumanized = false;

// Dictionary for common segments
const ediDict = {
    "ISA": { "06": "Sender ID", "08": "Receiver ID", "13": "Control No" },
    "GS": { "02": "Sender Code", "03": "Receiver Code", "06": "Control No" },
    "ST": { "01": "Txn Set", "02": "Control No" },
    "BEG": { "03": "PO Number", "05": "PO Date" },
    "N1": { "01": "Entity ID", "02": "Name", "04": "ID Code" },
    "REF": { "01": "Ref Qual", "02": "Ref ID" },
    "DTM": { "01": "Date Qual", "02": "Date" },
    "PO1": { "02": "Quantity", "03": "Unit", "04": "Price", "07": "Part No" },
    "CTT": { "01": "Line Count" },
    "SE": { "01": "Seg Count", "02": "Control No" },
    "GE": { "01": "Txn Count", "02": "Control No" },
    "IEA": { "01": "Grp Count", "02": "Control No" },
    // EDIFACT
    "UNB": { "2": "Sender", "3": "Receiver", "5": "Ref No" },
    "UNH": { "1": "Ref No", "2": "Msg Type" },
    "BGM": { "1": "Msg Name", "2": "Doc No" },
    "NAD": { "1": "Party Qual", "2": "Party ID" }
};

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

function toggleHumanize() {
    isHumanized = !isHumanized;
    const btn = document.getElementById('btn-humanize');
    const output = document.getElementById('edi-output');

    if (isHumanized) {
        btn.innerHTML = '<i class="fas fa-code"></i> Show Raw Codes';
        btn.classList.add('active'); // You might want to style this state
        output.classList.add('humanized');
    } else {
        btn.innerHTML = '<i class="fas fa-magic"></i> Humanize';
        btn.classList.remove('active');
        output.classList.remove('humanized');
    }

    // Re-parse to apply labels
    const input = document.getElementById('edi-input');
    parseEDI(input.value);
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
        if (raw.length > 3) elementSeparator = raw[3];
        if (raw.includes("~")) segmentTerminator = "~";
        else if (raw.includes("\n") && !raw.includes("~")) segmentTerminator = "\n";
    }
    else if (raw.startsWith("UNA") || raw.startsWith("UNB")) {
        format = "EDIFACT";
        if (raw.startsWith("UNA")) {
            if (raw.length >= 9) {
                elementSeparator = raw[4];
                segmentTerminator = raw[8];
            }
        } else {
            elementSeparator = "+";
            segmentTerminator = "'";
        }
    }

    document.getElementById('detected-format').textContent = `FORMAT: ${format}`;

    // Split Segments
    let cleanRaw = raw.replace(new RegExp(segmentTerminator + "\\n", "g"), segmentTerminator);
    const segments = cleanRaw.split(segmentTerminator).filter(s => s.trim().length > 0);

    let html = "";

    segments.forEach((seg, index) => {
        let elements = seg.trim().replace(/^\n/, '').split(elementSeparator);
        let segID = elements[0].trim();
        let values = elements.slice(1);

        let elementsHTML = values.map((val, i) => {
            let label = "";
            if (isHumanized && ediDict[segID]) {
                // Determine index key. X12 usually 1-based index (01, 02). 
                // Let's formatting the index i+1 to "01", "02" etc.
                let idxKey = (i + 1).toString().padStart(2, '0');
                // Adjust for EDIFACT which might just use 1, 2
                if (format === "EDIFACT") idxKey = (i + 1).toString();

                if (ediDict[segID][idxKey]) {
                    label = `<span class="edi-label">${ediDict[segID][idxKey]}</span>`;
                }
            }

            return `
            <div class="ele-val-wrapper">
                ${label}
                <span class="ele">[${i + 1}]</span><span class="ele-val">"${val}"</span>
            </div>
            `;
        }).join(' ');

        html += `
            <div class="segment-node" title="Segment ${index + 1}">
                <span class="seg-id">${segID}</span>
                ${elementsHTML}
            </div>
        `;
    });

    document.getElementById('edi-output').innerHTML = html;

    // Re-apply humanized class if needed (though we rebuild HTML, container class persists)
    const output = document.getElementById('edi-output');
    if (isHumanized) output.classList.add('humanized');
    else output.classList.remove('humanized');
}

