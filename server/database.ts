import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../lens-vault.db');
const db = new Database(dbPath);

// Initialize Database Schema
export const initDb = () => {
  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      master_password_hash TEXT NOT NULL,
      public_key TEXT,
      encrypted_private_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      subscription_plan TEXT DEFAULT 'free',
      billing_cycle TEXT DEFAULT 'monthly'
    )
  `);

  // Migration for existing users table (idempotent-ish)
  try {
    db.exec("ALTER TABLE users ADD COLUMN billing_cycle TEXT DEFAULT 'monthly'");
  } catch (error) {
    // Ignore error if column already exists
  }

  // Vaults Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vaults (
      user_id TEXT PRIMARY KEY,
      encrypted_data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Shared Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_items (
      id TEXT PRIMARY KEY,
      sender_email TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Timed Access (Digital Will) Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS timed_shares (
      id TEXT PRIMARY KEY,
      sender_email TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      release_date DATETIME NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, released, revoked
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Emergency Access Requests Table (Enhanced)
  db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_requests (
      id TEXT PRIMARY KEY,
      requester_email TEXT NOT NULL,
      target_user_email TEXT NOT NULL,
      proof_document_url TEXT,
      request_type TEXT NOT NULL, -- death, illness, absence, other
      status TEXT DEFAULT 'pending', -- pending, approved, rejected
      admin_notes TEXT,
      rejection_reason TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME
    )
  `);

  // Digital Will Configuration Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS digital_will_config (
      user_id TEXT PRIMARY KEY,
      beneficiary_email TEXT, -- Can be null if action is 'delete'
      condition TEXT NOT NULL, -- death, illness, absence
      action TEXT NOT NULL, -- transfer_access, delete_account
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Access Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL, -- e.g., 'login', 'share_create', 'emergency_access'
      resource_id TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized');
};

export default db;
