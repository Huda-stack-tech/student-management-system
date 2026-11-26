const BASE_URL = 'http://localhost:5000/api';
let allStudents = [];
let allCourses = [];
let allEnrollments = [];
let editingStudentId = null;

// ==================== 0. AUTHENTICATION (LOGIN / LOGOUT) ====================
function getToken() {
  return localStorage.getItem('sms_token');
}

// Shaqo gaar ah oo codsi kasta ku daraysa furaha amniga (Token)
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, { ...options, headers });

  // Haddii furuhu dhaco ama server-ka dib loo bilaabo, ku celi shaashadda Login-ka
  if (response.status === 401) {
    logout(false);
  }
  return response;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('login-message');

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = data.error || 'Gelitaanku wuu fashilmay!';
      return;
    }

    // Ku kaydi furaha (Token) iyo magaca maamulaha browser-ka
    localStorage.setItem('sms_token', data.token);
    localStorage.setItem('sms_user', data.user.full_name);

    messageEl.textContent = '';
    e.target.reset();
    showDashboard();
  } catch (error) {
    messageEl.style.color = '#b91c1c';
    messageEl.textContent = 'Server-ka laguma xidhmi karo!';
  }
});

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'block';
  document.getElementById('logged-user-name').textContent = localStorage.getItem('sms_user') || 'Admin';

  loadStudents();
  loadCourses();
  loadEnrollments();
}

async function logout(notifyServer = true) {
  if (notifyServer && getToken()) {
    await authFetch(`${BASE_URL}/logout`, { method: 'POST' }).catch(() => {});
  }
  localStorage.removeItem('sms_token');
  localStorage.removeItem('sms_user');

  document.getElementById('dashboard-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

// ==================== KALA WAREEGGA TABS-KA ====================
function switchTab(tabId, clickedBtn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  clickedBtn.classList.add('active');
}

// ==================== 1. MAAMULKA ARDAYDA (STUDENTS) ====================
async function loadStudents() {
  try {
    const response = await authFetch(`${BASE_URL}/students`);
    if (!response.ok) return;
    allStudents = await response.json();

    document.getElementById('total-students').textContent = allStudents.length;
    const activeCount = allStudents.filter(s => s.status === 'Active').length;
    document.getElementById('active-students').textContent = activeCount;

    renderStudentsTable(allStudents);
    populateStudentDropdown();
  } catch (error) {
    console.error('Cilad soo jiidashada ardayda:', error);
  }
}

function renderStudentsTable(studentsList) {
  const tableBody = document.getElementById('students-table-body');
  tableBody.innerHTML = '';

  if (studentsList.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Arday lama helin.</td></tr>';
    return;
  }

  studentsList.forEach(student => {
    const badgeClass = student.status === 'Active' ? 'badge' : 'badge badge-inactive';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${student.student_code}</strong></td>
      <td>${student.full_name}</td>
      <td>${student.email}</td>
      <td>${student.department}</td>
      <td><span class="${badgeClass}">${student.status}</span></td>
      <td>
        <button class="btn-edit" onclick="startEdit(${student.id})">Wax ka beddel</button>
        <button class="btn-delete" onclick="deleteStudent(${student.id})">Tirtir</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function startEdit(id) {
  const student = allStudents.find(s => s.id === id);
  if (!student) return;

  editingStudentId = id;
  document.getElementById('student_code').value = student.student_code;
  document.getElementById('full_name').value = student.full_name;
  document.getElementById('email').value = student.email;
  document.getElementById('department').value = student.department;
  document.getElementById('status').value = student.status;

  document.getElementById('form-title').textContent = `Wax ka Beddel: ${student.full_name}`;
  document.getElementById('submit-btn').textContent = 'Kaydi Isbeddelka';
  document.getElementById('cancel-btn').style.display = 'inline-block';
  document.getElementById('form-message').textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormMode() {
  editingStudentId = null;
  document.getElementById('add-student-form').reset();
  document.getElementById('form-title').textContent = 'Diiwaangeli Arday Cusub';
  document.getElementById('submit-btn').textContent = '+ Ku Dar Ardayga';
  document.getElementById('cancel-btn').style.display = 'none';
}

document.getElementById('cancel-btn').addEventListener('click', () => {
  resetFormMode();
  document.getElementById('form-message').textContent = '';
});

document.getElementById('add-student-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('form-message');

  const studentData = {
    student_code: document.getElementById('student_code').value.trim(),
    full_name: document.getElementById('full_name').value.trim(),
    email: document.getElementById('email').value.trim(),
    department: document.getElementById('department').value.trim(),
    status: document.getElementById('status').value
  };

  const isEditing = editingStudentId !== null;
  const url = isEditing ? `${BASE_URL}/students/${editingStudentId}` : `${BASE_URL}/students`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    const data = await response.json();

    if (!response.ok) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = data.error || 'Cilad ayaa dhacday!';
      return;
    }

    messageEl.style.color = '#166534';
    messageEl.textContent = data.message;
    resetFormMode();
    loadStudents();
    loadEnrollments();
  } catch (error) {
    messageEl.style.color = '#b91c1c';
    messageEl.textContent = 'Server-ka laguma xidhmi karo!';
  }
});

async function deleteStudent(id) {
  if (!confirm('Ma hubtaa inaad rabto inaad tirtirto ardaygan?')) return;

  const response = await authFetch(`${BASE_URL}/students/${id}`, { method: 'DELETE' });
  if (response.ok) {
    if (editingStudentId === id) resetFormMode();
    loadStudents();
    loadEnrollments();
  }
}

document.getElementById('search-input').addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  const filtered = allStudents.filter(s =>
    s.full_name.toLowerCase().includes(keyword) ||
    s.student_code.toLowerCase().includes(keyword) ||
    s.department.toLowerCase().includes(keyword)
  );
  renderStudentsTable(filtered);
});

// ==================== 2. MAAMULKA KOORSOOYINKA (COURSES) ====================
async function loadCourses() {
  try {
    const response = await authFetch(`${BASE_URL}/courses`);
    if (!response.ok) return;
    allCourses = await response.json();

    document.getElementById('total-courses').textContent = allCourses.length;
    renderCoursesTable();
    populateCourseDropdown();
  } catch (error) {
    console.error('Cilad soo jiidashada koorsooyinka:', error);
  }
}

function renderCoursesTable() {
  const tableBody = document.getElementById('courses-table-body');
  tableBody.innerHTML = '';

  if (allCourses.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Koorso lama helin.</td></tr>';
    return;
  }

  allCourses.forEach(course => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${course.course_code}</strong></td>
      <td>${course.title}</td>
      <td>${course.credit_hours} Credits</td>
      <td>
        <button class="btn-delete" onclick="deleteCourse(${course.id})">Tirtir</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

document.getElementById('add-course-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('course-message');

  const newCourse = {
    course_code: document.getElementById('course_code').value.trim(),
    title: document.getElementById('course_title').value.trim(),
    credit_hours: document.getElementById('credit_hours').value
  };

  try {
    const response = await authFetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    });
    const data = await response.json();

    if (!response.ok) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = data.error || 'Cilad ayaa dhacday!';
      return;
    }

    messageEl.style.color = '#166534';
    messageEl.textContent = data.message;
    e.target.reset();
    loadCourses();
  } catch (error) {
    messageEl.style.color = '#b91c1c';
    messageEl.textContent = 'Server-ka laguma xidhmi karo!';
  }
});

async function deleteCourse(id) {
  if (!confirm('Ma hubtaa inaad tirtirto koorsadan?')) return;

  const response = await authFetch(`${BASE_URL}/courses/${id}`, { method: 'DELETE' });
  if (response.ok) {
    loadCourses();
    loadEnrollments();
  }
}

// ==================== 3. DIIWAANGELINTA & DHIBCAHA (ENROLLMENTS) ====================
function populateStudentDropdown() {
  const select = document.getElementById('enroll-student-select');
  select.innerHTML = '<option value="">-- Dooro Ardayga --</option>';
  allStudents.forEach(s => {
    select.innerHTML += `<option value="${s.id}">${s.student_code} — ${s.full_name}</option>`;
  });
}

function populateCourseDropdown() {
  const select = document.getElementById('enroll-course-select');
  select.innerHTML = '<option value="">-- Dooro Koorsada --</option>';
  allCourses.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.course_code} — ${c.title}</option>`;
  });
}

async function loadEnrollments() {
  try {
    const response = await authFetch(`${BASE_URL}/enrollments`);
    if (!response.ok) return;
    allEnrollments = await response.json();

    document.getElementById('total-enrollments').textContent = allEnrollments.length;
    renderEnrollmentsTable();
  } catch (error) {
    console.error('Cilad soo jiidashada diiwaangelinta:', error);
  }
}

function renderEnrollmentsTable() {
  const tableBody = document.getElementById('enrollments-table-body');
  tableBody.innerHTML = '';

  if (allEnrollments.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Weli arday laguma qorin koorso.</td></tr>';
    return;
  }

  const grades = ['Pending', 'A', 'B+', 'B', 'C', 'F'];

  allEnrollments.forEach(item => {
    const optionsHtml = grades.map(g =>
      `<option value="${g}" ${item.grade === g ? 'selected' : ''}>${g}</option>`
    ).join('');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${item.student_code}</strong> — ${item.full_name}</td>
      <td><strong>${item.course_code}</strong> — ${item.course_title}</td>
      <td>
        <select class="grade-select" onchange="updateGrade(${item.id}, this.value)">
          ${optionsHtml}
        </select>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteEnrollment(${item.id})">Ka Saar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

document.getElementById('add-enrollment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('enrollment-message');

  const payload = {
    student_id: document.getElementById('enroll-student-select').value,
    course_id: document.getElementById('enroll-course-select').value,
    grade: document.getElementById('enroll-grade-select').value
  };

  try {
    const response = await authFetch(`${BASE_URL}/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = data.error || 'Cilad ayaa dhacday!';
      return;
    }

    messageEl.style.color = '#166534';
    messageEl.textContent = data.message;
    e.target.reset();
    loadEnrollments();
  } catch (error) {
    messageEl.style.color = '#b91c1c';
    messageEl.textContent = 'Server-ka laguma xidhmi karo!';
  }
});

async function updateGrade(id, newGrade) {
  await authFetch(`${BASE_URL}/enrollments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade: newGrade })
  });
}

async function deleteEnrollment(id) {
  if (!confirm('Ma hubtaa inaad ardaygan ka saarto koorsadan?')) return;

  const response = await authFetch(`${BASE_URL}/enrollments/${id}`, { method: 'DELETE' });
  if (response.ok) {
    loadEnrollments();
  }
}

// Markuu boggu furmo, hubi in isticmaaluhu hore u soo galay
if (getToken()) {
  showDashboard();
}

// ==================== 4. SOO SAARISTA WARBIXINTA (CSV EXPORT) ====================
function exportStudentsCSV() {
  if (allStudents.length === 0) {
    alert('Ma jirto xog arday oo la soo dejiyo!');
    return;
  }

  const headers = ['Student Code', 'Full Name', 'Email', 'Department', 'Status'];
  const rows = allStudents.map(s => [
    `"${s.student_code}"`,
    `"${s.full_name}"`,
    `"${s.email}"`,
    `"${s.department}"`,
    `"${s.status}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'students_report.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}