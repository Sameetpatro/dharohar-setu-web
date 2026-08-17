import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import config from '../config.js'

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db = new Database(config.dbPath)

// Enable WAL mode for high concurrency performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase() {
  // 1. Users table (Admin & Normal Users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN', 'USER', 'STAFF')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 2. Sites table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      description TEXT,
      summary TEXT,
      image_url TEXT,
      cover_image TEXT,
      qr_value TEXT UNIQUE,
      guide_status TEXT DEFAULT 'English active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 3. Nodes table (heritage waypoints/stops)
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sequence_order INTEGER DEFAULT 1,
      node_type TEXT DEFAULT 'standard' CHECK(node_type IN ('king', 'standard', 'poi', 'exit')),
      latitude REAL,
      longitude REAL,
      qr_value TEXT UNIQUE,
      audio_guide_url TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `)

  // 4. Recommendations table (hotels, restaurants, monuments near site)
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('hotel', 'restaurant', 'monument', 'craft', 'cafe')),
      name TEXT NOT NULL,
      distance_km REAL DEFAULT 0.5,
      rating REAL DEFAULT 4.5,
      address TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `)

  // 5. Trips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      start_node_id TEXT,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `)

  // 6. Visit History table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visit_history (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      node_id TEXT,
      visited_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_minutes INTEGER DEFAULT 15,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `)

  // 7. Reviews table (rating and 3-question survey metrics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      q1_clarity INTEGER DEFAULT 5 CHECK(q1_clarity >= 1 AND q1_clarity <= 5),
      q2_accessibility INTEGER DEFAULT 5 CHECK(q2_accessibility >= 1 AND q2_accessibility <= 5),
      q3_overall INTEGER DEFAULT 5 CHECK(q3_overall >= 1 AND q3_overall <= 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // 8. AI context prompts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_prompts (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      node_id TEXT,
      prompt_text TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      system_context TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `)

  // 9. Password Resets table (single-use, short-lived tokens)
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Create indexes for high performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sites_qr ON sites(qr_value);
    CREATE INDEX IF NOT EXISTS idx_nodes_site ON nodes(site_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_qr ON nodes(qr_value);
    CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
    CREATE INDEX IF NOT EXISTS idx_trips_site ON trips(site_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
  `)

  console.log('✔ SQLite Database initialized successfully at:', config.dbPath)
}

export default db
