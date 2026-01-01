
// Using built-in fetch (Node 18+)

async function runTests() {
    const baseUrl = 'http://127.0.0.1:3001/api';
    let cookie = '';

    const request = async (endpoint, method, body) => {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        const res = await fetch(baseUrl + endpoint, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();

        // Capture cookie from login/signup
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
            cookie = setCookie.split(';')[0];
        }

        return { status: res.status, body: data };
    };

    try {
        console.log('Testing Signup...');
        const signupRes = await request('/auth/signup', 'POST', { email: 'test@example.com', masterPasswordHash: 'hash123' });
        console.log('Signup:', signupRes.body);

        if (!cookie) {
            console.log('User might exist, trying login...');
            const loginRes = await request('/auth/login', 'POST', { email: 'test@example.com', masterPasswordHash: 'hash123' });
            console.log('Login:', loginRes.body);
        }

        if (!cookie) {
            throw new Error('Failed to get cookie');
        }

        console.log('Testing Get Vault...');
        const getVaultRes = await request('/vault', 'GET');
        console.log('Get Vault:', getVaultRes.body);

        console.log('Testing Save Vault...');
        const saveVaultRes = await request('/vault', 'PUT', { encryptedData: 'encrypted-blob-data' });
        console.log('Save Vault:', saveVaultRes.body);

        console.log('Testing Get Vault Again...');
        const getVaultRes2 = await request('/vault', 'GET');
        console.log('Get Vault 2:', getVaultRes2.body);

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

runTests();
