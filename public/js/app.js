(() => {
  const API = '/api';
  let token = localStorage.getItem('mgs_token') || null;
  let currentUser = JSON.parse(localStorage.getItem('mgs_user') || 'null');

  const $ = (id) => document.getElementById(id);

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function showLogin() {
    $('registerCard').style.display = 'none';
    $('loginScreen').querySelector('.auth-card').style.display = 'block';
  }

  function saveSession(token_, user) {
    token = token_;
    currentUser = user;
    localStorage.setItem('mgs_token', token);
    localStorage.setItem('mgs_user', JSON.stringify(user));
  }

  function clearSession() {
    token = null;
    currentUser = null;
    localStorage.removeItem('mgs_token');
    localStorage.removeItem('mgs_user');
  }

  function showApp() {
    $('loginScreen').style.display = 'none';
    $('appScreen').style.display = 'flex';
    $('userName').textContent = currentUser.full_name || currentUser.email;
    $('userRole').textContent = currentUser.role;
    loadDashboard();
    loadCurrentSession();
  }

  function showAuth() {
    $('appScreen').style.display = 'none';
    $('loginScreen').style.display = 'flex';
  }

  // ----- Auth forms -----
  $('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    $('loginScreen').querySelectorAll('.auth-card')[0].style.display = 'none';
    $('registerCard').style.display = 'block';
  });
  $('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
  });

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').textContent = '';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('loginEmail').value.trim(),
          password: $('loginPassword').value,
        }),
      });
      saveSession(data.token, data.user);
      showApp();
    } catch (err) {
      $('loginError').textContent = err.message;
    }
  });

  $('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('registerError').textContent = '';
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: $('regName').value.trim(),
          email: $('regEmail').value.trim(),
          password: $('regPassword').value,
        }),
      });
      saveSession(data.token, data.user);
      showApp();
    } catch (err) {
      $('registerError').textContent = err.message;
    }
  });

  $('logoutBtn').addEventListener('click', () => {
    clearSession();
    showAuth();
  });

  // ----- Navigation -----
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const view = el.getAttribute('data-view');
      navigateTo(view);
    });
  });

  function navigateTo(view) {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navEl) navEl.classList.add('active');

    const titles = {
      dashboard: ['Dashboard', 'Exam overview at a glance'],
      exams: ['Exams', 'Create and manage exams'],
      datesheet: ['Date Sheet', 'Build and publish exam schedules'],
      classes: ['Classes & Subjects', 'Manage class structure and subjects'],
      students: ['Students', 'Student exam records'],
      results: ['Results & Report Cards', 'Marks entry and report card generation'],
      reports: ['Reports', 'Analytics and performance reports'],
    };
    const [title, subtitle] = titles[view] || ['MGS Exam System', ''];
    $('viewTitle').textContent = title;
    $('viewSubtitle').textContent = subtitle;

    if (view === 'dashboard') {
      $('view-dashboard').style.display = 'block';
      $('view-placeholder').style.display = 'none';
      loadDashboard();
    } else {
      $('view-dashboard').style.display = 'none';
      $('view-placeholder').style.display = 'block';
      $('placeholderTitle').textContent = title;
    }
  }

  // ----- Dashboard data -----
  function statusBadge(status) {
    const cls = { upcoming: 'status-upcoming', running: 'status-running', completed: 'status-completed' }[status] || '';
    return `<span class="status-badge ${cls}">${status}</span>`;
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function loadDashboard() {
    try {
      const { stats, upcomingExams } = await api('/dashboard/stats');
      $('statTotal').textContent = stats.total_exams;
      $('statUpcoming').textContent = stats.upcoming_exams;
      $('statRunning').textContent = stats.running_exams;
      $('statCompleted').textContent = stats.completed_exams;
      $('statClasses').textContent = stats.total_classes;
      $('statSubjects').textContent = stats.total_subjects;

      const tbody = $('upcomingExamsBody');
      if (!upcomingExams.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No upcoming or running exams yet — create one to get started.</td></tr>';
      } else {
        tbody.innerHTML = upcomingExams.map((ex) => `
          <tr>
            <td>${ex.name}</td>
            <td>${ex.class_name}${ex.section_name ? ' - ' + ex.section_name : ''}</td>
            <td>${fmtDate(ex.start_date)} – ${fmtDate(ex.end_date)}</td>
            <td>${statusBadge(ex.status)}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      if (err.message.includes('Invalid or expired token') || err.message.includes('Missing')) {
        clearSession();
        showAuth();
      }
    }
  }

  async function loadCurrentSession() {
    try {
      const session = await api('/sessions/current');
      $('sessionBadge').textContent = `Session: ${session.name}`;
    } catch {
      $('sessionBadge').textContent = 'No active session';
    }
  }

  // ----- Boot -----
  if (token && currentUser) {
    showApp();
  } else {
    showAuth();
  }
})();
