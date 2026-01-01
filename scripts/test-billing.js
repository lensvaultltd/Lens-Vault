
const fetch = require('node-fetch'); // Or built-in fetch in Node 18+

const baseUrl = 'http://127.0.0.1:3001/api';

async function request(endpoint, method, body, cookie) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(baseUrl + endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    const newCookie = setCookie ? setCookie.split(';')[0] : null;

    return { status: res.status, body: data, cookie: newCookie || cookie };
}

async function runTest() {
    try {
        console.log('--- Starting Billing Test ---');

        // 1. Signup
        const email = `billing_test_${Date.now()}@test.com`;
        console.log(`Creating user ${email}...`);
        const signupRes = await request('/auth/signup', 'POST', {
            email,
            masterPasswordHash: 'hash123'
        });
        const cookie = signupRes.cookie;

        if (!cookie) throw new Error('Signup failed, no cookie');

        // 2. Check initial plan (Free)
        console.log('Checking initial plan...');
        const meRes = await request('/auth/me', 'GET', null, cookie);
        console.log('Current Plan:', meRes.body.user.subscription);

        if (meRes.body.user.subscription !== 'free') {
            throw new Error('Initial plan should be free');
        }

        // 3. Get Plans
        console.log('Fetching available plans...');
        const plansRes = await request('/billing/plans', 'GET', null, cookie);
        console.log('Plans found:', plansRes.body.plans.length);

        // 4. Subscribe to Pro
        console.log('Upgrading to Pro...');
        const subRes = await request('/billing/subscribe', 'POST', {
            planId: 'pro',
            cycle: 'monthly'
        }, cookie);
        console.log('Upgrade Result:', subRes.body);

        // 5. Verify Pro Plan
        console.log('Verifying Pro plan...');
        const meRes2 = await request('/auth/me', 'GET', null, cookie);
        console.log('Current Plan:', meRes2.body.user.subscription);

        if (meRes2.body.user.subscription !== 'pro') {
            throw new Error('Plan update failed');
        }

        // 6. Cancel Subscription
        console.log('Canceling subscription...');
        const cancelRes = await request('/billing/cancel', 'POST', null, cookie);
        console.log('Cancel Result:', cancelRes.body);

        // 7. Verify Free Plan
        console.log('Verifying Free plan...');
        const meRes3 = await request('/auth/me', 'GET', null, cookie);
        console.log('Current Plan:', meRes3.body.user.subscription);

        if (meRes3.body.user.subscription !== 'free') {
            throw new Error('Cancellation failed');
        }

        console.log('--- Test Passed Successfully ---');

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
}

runTest();
