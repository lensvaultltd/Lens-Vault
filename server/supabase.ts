import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
// Using Service Role Key for Backend to bypass RLS (Row Level Security) and ensure writes succeed
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) { // Checks are redundant with hardcoding but good practice
    console.warn("WARNING: SUPABASE_URL or KEY is missing. Database calls will fail/hang.");
    console.log("Debug - URL:", supabaseUrl ? "Set" : "Missing");
    console.log("Debug - Key:", supabaseKey ? "Set" : "Missing");
} else {
    console.log("Supabase initialized with URL:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
