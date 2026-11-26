const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const db = require('./db');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Kaydka furayaasha (Tokens) ee dadka hadda ku jira system-ka
const activeTokens = new Set();

// ==================== 1. HOME & LOGIN ROUTES ====================
app.get('/', (req, res) => {
  res.json({
    message: 'Ku soo dhawaaw Student Management System API!',
    status: 'Server-ku si fiican ayuu u shaqaynayaa'
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Fadlan geli Username iyo Password!' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const user = db.prepare('SELECT id, full_name, username, role FROM users WHERE username = ? AND password_hash = ?')
    .get(username, passwordHash);

  if (!user) {
    return res.status(401).json({ error: 'Username ama Password-ka aad gelisay waa khalad!' });
  }

  // Samee fure (Token) gaar ah oo u fasaxaya inuu system-ka isticmaalo
  const token = crypto.randomBytes(24).toString('hex');
  activeTokens.add(token);

  res.json({
    message: 'Si guul ah ayaad u soo gashay!',
    token,
    user
  });
});

app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  activeTokens.delete(token);
  res.json({ message: 'Waad ka baxday system-ka.' });
});

// ==================== 2. ILAALADA AMNIGA (MIDDLEWARE) ====================
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ error: 'Fadlan marka hore soo gal system-ka (Unauthorized)!' });
  }

  next(); // Haddii furuhu sax yahay, u gudub shaqada xigta
}

// Ku xidh ilaalada dhammaan waddooyinka xogta
app.use('/api/students', requireAuth);
app.use('/api/courses', requireAuth);
app.use('/api/enrollments', requireAuth);

// ==================== 3. STUDENTS ROUTES ====================
app.get('/api/students', (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY id DESC').all();
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const { student_code, full_name, email, department } = req.body;
  if (!student_code || !full_name || !email || !department) {
    return res.status(400).json({ error: 'Fadlan buuxi dhammaan meelaha bannaan!' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO students (student_code, full_name, email, department)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(student_code, full_name, email, department);
    res.status(201).json({
      message: 'Ardayga si guul ah ayaa loo diiwaangeliyay!',
      id: Number(result.lastInsertRowid)
    });
  } catch (err) {
    res.status(400).json({ error: 'Student Code ama Email-kan hore ayaa loo isticmaalay!' });
  }
});

app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { student_code, full_name, email, department, status } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE students
      SET student_code = ?, full_name = ?, email = ?, department = ?, status = ?
      WHERE id = ?
    `);
    const result = stmt.run(student_code, full_name, email, department, status || 'Active', id);
    if (result.changes === 0) return res.status(404).json({ error: 'Ardaygaas lama helin!' });
    res.json({ message: 'Xogta ardayga waa la cusboonaysiiyay!' });
  } catch (err) {
    res.status(400).json({ error: 'Cilad ayaa dhacday markii xogta la beddelayay.' });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ardaygaas lama helin!' });
  res.json({ message: 'Ardayga waa la tirtiray!' });
});

// ==================== 4. COURSES ROUTES ====================
app.get('/api/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY id DESC').all();
  res.json(courses);
});

app.post('/api/courses', (req, res) => {
  const { course_code, title, credit_hours } = req.body;
  if (!course_code || !title) {
    return res.status(400).json({ error: 'Fadlan geli lambarka iyo magaca koorsada!' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO courses (course_code, title, credit_hours)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(course_code, title, Number(credit_hours) || 3);
    res.status(201).json({
      message: 'Koorsada si guul ah ayaa loogu daray!',
      id: Number(result.lastInsertRowid)
    });
  } catch (err) {
    res.status(400).json({ error: 'Course Code-kan hore ayuu u jiraa!' });
  }
});

app.delete('/api/courses/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Koorsadaas lama helin!' });
  res.json({ message: 'Koorsada waa la tirtiray!' });
});

// ==================== 5. ENROLLMENTS ROUTES ====================
app.get('/api/enrollments', (req, res) => {
  const enrollments = db.prepare(`
    SELECT
      enrollments.id,
      enrollments.student_id,
      enrollments.course_id,
      enrollments.grade,
      students.student_code,
      students.full_name,
      courses.course_code,
      courses.title AS course_title
    FROM enrollments
    JOIN students ON enrollments.student_id = students.id
    JOIN courses ON enrollments.course_id = courses.id
    ORDER BY enrollments.id DESC
  `).all();
  res.json(enrollments);
});

app.post('/api/enrollments', (req, res) => {
  const { student_id, course_id, grade } = req.body;
  if (!student_id || !course_id) {
    return res.status(400).json({ error: 'Fadlan dooro ardayga iyo koorsada!' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO enrollments (student_id, course_id, grade)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(Number(student_id), Number(course_id), grade || 'Pending');
    res.status(201).json({
      message: 'Ardayga si guul ah ayaa loogu diiwaangeliyay koorsada!',
      id: Number(result.lastInsertRowid)
    });
  } catch (err) {
    res.status(400).json({ error: 'Ardaygan hore ayaa loogu diiwaangeliyay koorsadan!' });
  }
});

app.put('/api/enrollments/:id', (req, res) => {
  const { id } = req.params;
  const { grade } = req.body;
  const result = db.prepare('UPDATE enrollments SET grade = ? WHERE id = ?').run(grade, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Diiwaangelintaas lama helin!' });
  res.json({ message: 'Darajada (Grade) waa la cusboonaysiiyay!' });
});

app.delete('/api/enrollments/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM enrollments WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Diiwaangelintaas lama helin!' });
  res.json({ message: 'Ardayga waa laga saaray koorsada!' });
});

app.listen(PORT, () => {
  console.log(`Server-ku wuxuu ka shaqaynayaa: http://localhost:${PORT}`);
});