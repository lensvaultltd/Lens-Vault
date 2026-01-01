
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Load .env explicitly (default location)
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Verifying Supabase Connection...");
console.log("URL:", supabaseUrl);
console.log("Key Present:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing configuration!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error("❌ Connection Failed:", error.message);
        } else {
            console.log("✅ Supabase Connection Successful! (Count query worked)");
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

verify();
