// API Request Builder Tool
class APITester {
    constructor() {
        this.method = 'GET';
        this.url = '';
        this.headers = {};
        this.body = '';
    }

    async sendRequest() {
        const outputDiv = document.getElementById('api-response');
        const statusDiv = document.getElementById('api-status');

        try {
            outputDiv.textContent = 'Sending request...';
            statusDiv.textContent = 'Loading...';
            statusDiv.className = 'status-badge status-loading';

            const options = {
                method: this.method,
                headers: this.headers
            };

            if (this.method !== 'GET' && this.method !== 'HEAD' && this.body) {
                options.body = this.body;
            }

            const startTime = performance.now();
            const response = await fetch(this.url, options);
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            const responseText = await response.text();

            // Format response
            let formattedResponse = '';
            try {
                const jsonData = JSON.parse(responseText);
                formattedResponse = JSON.stringify(jsonData, null, 2);
            } catch {
                formattedResponse = responseText;
            }

            outputDiv.textContent = formattedResponse;
            statusDiv.textContent = `${response.status} ${response.statusText} • ${duration}ms`;
            statusDiv.className = `status-badge ${response.ok ? 'status-success' : 'status-error'}`;

        } catch (error) {
            outputDiv.textContent = `Error: ${error.message}`;
            statusDiv.textContent = 'Request Failed';
            statusDiv.className = 'status-badge status-error';
        }
    }

    generateCurl() {
        let curl = `curl -X ${this.method} '${this.url}'`;

        Object.entries(this.headers).forEach(([key, value]) => {
            curl += ` \\\n  -H '${key}: ${value}'`;
        });

        if (this.body && this.method !== 'GET') {
            curl += ` \\\n  -d '${this.body}'`;
        }

        return curl;
    }
}

// Initialize API Tester
let apiTester = new APITester();

function sendAPIRequest() {
    const method = document.getElementById('api-method').value;
    const url = document.getElementById('api-url').value;
    const headersText = document.getElementById('api-headers').value;
    const body = document.getElementById('api-body').value;

    apiTester.method = method;
    apiTester.url = url;
    apiTester.body = body;

    // Parse headers
    apiTester.headers = {};
    if (headersText.trim()) {
        headersText.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                apiTester.headers[key.trim()] = valueParts.join(':').trim();
            }
        });
    }

    apiTester.sendRequest();
}

function copyCurl() {
    const curl = apiTester.generateCurl();
    navigator.clipboard.writeText(curl).then(() => {
        alert('cURL copied to clipboard!');
    });
}

function loadSampleAPI() {
    document.getElementById('api-url').value = 'https://jsonplaceholder.typicode.com/posts/1';
    document.getElementById('api-method').value = 'GET';
    document.getElementById('api-headers').value = 'Accept: application/json';
    document.getElementById('api-body').value = '';
}
