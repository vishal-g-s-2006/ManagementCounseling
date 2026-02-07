const http = require('http');

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data ? data.length : 0
            }
        };

        const req = http.request(options, res => {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: JSON.parse(responseBody || '{}') });
            });
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function test() {
    try {
        const email = `test${Date.now()}@example.com`;
        const password = 'password123';

        console.log('Testing Registration...');
        const reg = await request('/auth/register', 'POST', { email, password });
        if (reg.status !== 200) throw new Error('Registration failed: ' + JSON.stringify(reg.body));
        console.log('PASS: Registration');

        console.log('Testing Login...');
        const login = await request('/auth/login', 'POST', { email, password });
        if (login.status !== 200 || !login.body.id) throw new Error('Login failed');
        console.log('PASS: Login');

        const userId = login.body.id;

        console.log('Testing Save Application...');
        const save = await request('/application/save', 'POST', {
            userId,
            personal: { name: "Test Student" },
            academic: { score: 90 },
            documents: {}
        });
        if (save.status !== 200) throw new Error('Save failed');
        console.log('PASS: Save Application');

        console.log('Testing Get Application...');
        const getApp = await request(`/application/${userId}`, 'GET');
        if (getApp.status !== 200 || getApp.body.personal_details.name !== "Test Student") throw new Error('Get Application failed: ' + JSON.stringify(getApp.body));
        console.log('PASS: Get Application');

        console.log('Testing Submit...');
        const submit = await request('/application/submit', 'POST', { userId });
        if (submit.status !== 200) throw new Error('Submit failed');
        console.log('PASS: Submit');

        console.log('ALL TESTS PASSED');
    } catch (err) {
        console.error('TEST FAILED:', err.message);
        process.exit(1);
    }
}

test();
