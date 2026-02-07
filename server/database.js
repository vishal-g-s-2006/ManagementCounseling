const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tnea.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Applications Table
  // Store JSON blobs for complex nested data to keep schema simple for this prototype
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    personal_details TEXT,
    academic_details TEXT,
    documents TEXT,
    payment_status TEXT DEFAULT 'pending', 
    status TEXT DEFAULT 'draft',
    submission_date DATETIME,
    choices TEXT,
    allotment_details TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, (err) => {
    if (!err) {
      // Attempt to add columns if table already exists but column doesn't
      db.run(`ALTER TABLE applications ADD COLUMN choices TEXT`, () => { });
      db.run(`ALTER TABLE applications ADD COLUMN allotment_details TEXT`, () => { });
    }
  });
});

module.exports = db;
