const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const db = new DatabaseSync('school.db');
db.exec('PRAGMA foreign_keys = ON;');

// 1. Jadwalka Maamulayaasha (Users - CUSUB)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'Admin'
  )
`);

// 2. Jadwalka Ardayda
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    status TEXT DEFAULT 'Active'
  )
`);

// 3. Jadwalka Koorsooyinka
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credit_hours INTEGER DEFAULT 3
  )
`);

// 4. Jadwalka Isku-xidhka Ardayga iyo Koorsada
db.exec(`
  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT DEFAULT 'Pending',
    UNIQUE(student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )
`);

// Abuur hal Admin ah haddii jadwalka users madhan yahay
const userRow = db.prepare('SELECT COUNT(*) AS count FROM users').get();
if (userRow.count === 0) {
  const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
  db.prepare(`
    INSERT INTO users (full_name, username, password_hash, role)
    VALUES (?, ?, ?, ?)
  `).run('Maamulaha Guud', 'admin', hashedPassword, 'Admin');
  console.log('Akoonka Admin-ka waa la abuuray (Username: admin | Password: admin123)');
}

module.exports = db;