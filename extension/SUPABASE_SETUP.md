# Extension Supabase Setup Instructions

## ⚠️ REQUIRED: Add Your Supabase Credentials

The extension needs your Supabase credentials to connect to your vault.

### Steps:

1. **Open:** `C:\Users\Fatim\Downloads\LensVaultExtension\background.js`

2. **Find these lines (at the top):**
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

3. **Replace with your actual credentials:**
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### Where to find credentials:
- **Supabase Dashboard** → Your Project → Settings → API
- Copy **Project URL** → paste as `SUPABASE_URL`
- Copy **anon public** key → paste as `SUPABASE_ANON_KEY`

### After updating:
1. Save `background.js`
2. Reload extension in Chrome (`chrome://extensions` → reload icon)
3. Test on any login page

---

## Architecture:
✅ Extension reads from `vault_items` table in Supabase  
✅ Extension saves to `vault_items` table in Supabase  
❌ NO local storage of passwords (security)  
✅ Same database as main Lens Vault app
