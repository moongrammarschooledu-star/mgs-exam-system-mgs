(() => {
  const API = '/api';
  let token = localStorage.getItem('mgs_token') || null;
  let currentUser = JSON.parse(localStorage.getItem('mgs_user') || 'null');

  const $ = (id) => document.getElementById(id);

  // ----- Shared lookup caches -----
  let classes = [];
  let sections = [];
  let subjects = [];
  let sessionsList = [];
  let examsList = [];
  let studentsCache = [];

  // ----- Toast notifications -----
  function showToast(message, type = 'success') {
    const container = $('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 200);
    }, 3200);
  }

  // ----- Custom confirm dialog (replaces window.confirm) -----
  function showConfirm(message, { confirmLabel = 'Delete', danger = true } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box">
          <p>${message}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" data-modal="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-modal="confirm">${confirmLabel}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = (result) => { overlay.remove(); resolve(result); };
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      overlay.querySelector('[data-modal="cancel"]').addEventListener('click', () => close(false));
      overlay.querySelector('[data-modal="confirm"]').addEventListener('click', () => close(true));
    });
  }

  // ----- Button loading state -----
  function setBtnLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
      if (btn.dataset.originalText === undefined) btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span>${btn.dataset.originalText}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalText !== undefined) btn.textContent = btn.dataset.originalText;
    }
  }

  function submitBtnOf(e) {
    return e.submitter || (e.target.querySelector ? e.target.querySelector('button[type="submit"]') : null);
  }

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

  function handleAuthError(err) {
    if (err.message.includes('Invalid or expired token') || err.message.includes('Missing')) {
      clearSession();
      showAuth();
      return true;
    }
    return false;
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

  // ----- Mobile sidebar -----
  const sidebarEl = document.querySelector('.sidebar');
  const overlayEl = $('sidebarOverlay');
  function closeSidebar() {
    if (sidebarEl) sidebarEl.classList.remove('open');
    if (overlayEl) overlayEl.classList.remove('open');
  }
  function toggleSidebar() {
    if (sidebarEl) sidebarEl.classList.toggle('open');
    if (overlayEl) overlayEl.classList.toggle('open');
  }
  if ($('hamburgerBtn')) $('hamburgerBtn').addEventListener('click', toggleSidebar);
  if (overlayEl) overlayEl.addEventListener('click', closeSidebar);

  // ----- Navigation -----
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const view = el.getAttribute('data-view');
      navigateTo(view);
      closeSidebar();
    });
  });

  const VIEW_TITLES = {
    dashboard: ['Dashboard', 'Exam overview at a glance'],
    exams: ['Exams', 'Create and manage exams'],
    datesheet: ['Date Sheet', 'Build and publish exam schedules'],
    classes: ['Classes & Subjects', 'Manage class structure and subjects'],
    students: ['Students', 'Student exam records'],
    papers: ['Question Papers', 'Create and manage question papers'],
    attendance: ['Exam Attendance', 'Mark present / absent per subject'],
    marks: ['Marks Entry', 'Enter subject-wise marks'],
    results: ['Results & Report Cards', 'Marks entry and report card generation'],
    gazette: ['Gazette', 'Class-wide result summary & toppers'],
    reports: ['Reports', 'Analytics and performance reports'],
    promotion: ['Promotion', 'Promote students to the next class'],
    settings: ['Settings', 'School branding & system configuration'],
  };

  const VIEW_LOADERS = {
    dashboard: loadDashboard,
    exams: loadExamsView,
    datesheet: loadDateSheetView,
    classes: loadClassesView,
    students: loadStudentsView,
    papers: loadPapersView,
    attendance: loadAttendanceView,
    marks: loadMarksView,
    results: loadResultsView,
    gazette: loadGazetteView,
    reports: loadReportsView,
    promotion: loadPromotionView,
    settings: loadSettingsView,
  };

  function navigateTo(view) {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navEl) navEl.classList.add('active');

    const [title, subtitle] = VIEW_TITLES[view] || ['MGS Exam System', ''];
    $('viewTitle').textContent = title;
    $('viewSubtitle').textContent = subtitle;

    document.querySelectorAll('.view').forEach((v) => { v.style.display = 'none'; });
    const section = $(`view-${view}`);
    if (section) section.style.display = 'block';

    const loader = VIEW_LOADERS[view];
    if (loader) loader();
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
      handleAuthError(err);
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

  // ----- Shared lookups -----
  async function loadLookups({ force = false } = {}) {
    if (!force && classes.length) return;
    [classes, sections, subjects, sessionsList] = await Promise.all([
      api('/classes'), api('/sections'), api('/subjects'), api('/sessions'),
    ]);
  }

  function fillSelect(el, items, { valueKey = 'id', labelKey = 'name', labelFn, placeholder, keepFirst = false } = {}) {
    if (!el) return;
    const currentValue = el.value;
    const head = keepFirst && el.options.length ? `<option value="${el.options[0].value}">${el.options[0].textContent}</option>` : (placeholder ? `<option value="">${placeholder}</option>` : '');
    const label = labelFn || ((it) => it[labelKey]);
    el.innerHTML = head + items.map((it) => `<option value="${it[valueKey]}">${label(it)}</option>`).join('');
    if ([...el.options].some((o) => o.value === currentValue)) el.value = currentValue;
  }

  // Exam dropdown label: many schools reuse the same exam name (e.g. "Mid
  // Term Examination") across every class, so the class/section must be
  // shown too or every option in the list looks identical.
  function examLabel(ex) {
    const cls = ex.class_name ? `${ex.class_name}${ex.section_name ? ' - ' + ex.section_name : ''}` : '';
    return cls ? `${ex.name} — ${cls}` : ex.name;
  }

  function sectionsForClass(classId) {
    return sections.filter((s) => s.class_id === classId);
  }

  function classSectionSelects(classSelectEl, sectionSelectEl, placeholder = '—') {
    classSelectEl.addEventListener('change', () => {
      fillSelect(sectionSelectEl, sectionsForClass(classSelectEl.value), { placeholder });
    });
  }

  // ===================================================================
  // EXAMS (Phase 3)
  // ===================================================================
  async function loadExamsView() {
    try {
      await loadLookups();
      fillSelect($('examClass'), classes);
      fillSelect($('examSection'), sectionsForClass($('examClass').value), { placeholder: 'All sections' });
      classSectionSelects($('examClass'), $('examSection'), 'All sections');

      examsList = await api('/exams');
      const tbody = $('examsBody');
      if (!examsList.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No exams yet.</td></tr>';
      } else {
        tbody.innerHTML = examsList.map((ex) => `
          <tr>
            <td>${ex.name}</td>
            <td>${ex.exam_type}</td>
            <td>${ex.class_name || ''}${ex.section_name ? ' - ' + ex.section_name : ''}</td>
            <td>${fmtDate(ex.start_date)} – ${fmtDate(ex.end_date)}</td>
            <td>${statusBadge(ex.status)}</td>
            <td class="table-actions">
              <button class="btn btn-ghost btn-sm" data-del-exam="${ex.id}">Delete</button>
            </td>
          </tr>
        `).join('');
        tbody.querySelectorAll('[data-del-exam]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            if (!(await showConfirm('Delete this exam and all its data? This cannot be undone.'))) return;
            try {
              await api(`/exams/${btn.getAttribute('data-del-exam')}`, { method: 'DELETE' });
              showToast('Exam deleted.');
              loadExamsView();
            } catch (err) { showToast(err.message, 'error'); }
          });
        });
      }
    } catch (err) { handleAuthError(err); }
  }

  $('examForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      const currentSession = sessionsList.find((s) => s.is_current) || sessionsList[0];
      await api('/exams', {
        method: 'POST',
        body: JSON.stringify({
          name: $('examName').value.trim(),
          examType: $('examType').value,
          sessionId: currentSession ? currentSession.id : null,
          classId: $('examClass').value,
          sectionId: $('examSection').value || null,
          startDate: $('examStart').value,
          endDate: $('examEnd').value,
        }),
      });
      $('examForm').reset();
      showToast('Exam created.');
      loadExamsView();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  // ===================================================================
  // DATE SHEET (Phase 4)
  // ===================================================================
  async function loadDateSheetView() {
    try {
      await loadLookups();
      if (!examsList.length) examsList = await api('/exams');
      fillSelect($('dsExamSelect'), examsList, { labelFn: examLabel });
      fillSelect($('schedSubject'), subjects);
      $('dsExamSelect').onchange = renderDateSheet;
      renderDateSheet();
    } catch (err) { handleAuthError(err); }
  }

  async function renderDateSheet() {
    const examId = $('dsExamSelect').value;
    const tbody = $('dateSheetBody');
    if (!examId) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Select an exam</td></tr>'; return; }
    const exam = examsList.find((e) => e.id === examId);
    $('dsTitle').textContent = exam ? `Date Sheet — ${examLabel(exam)}` : 'Date Sheet';
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Loading…</td></tr>';
    const schedule = await api(`/exams/${examId}/schedule`);
    if (!schedule.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No papers scheduled yet.</td></tr>';
    } else {
      tbody.innerHTML = schedule.map((s) => {
        const subj = subjects.find((x) => x.id === s.subject_id);
        return `<tr>
          <td>${subj ? subj.name : ''}</td>
          <td>${fmtDate(s.exam_date)}</td>
          <td>${s.start_time} – ${s.end_time}</td>
          <td>${s.duration_mins} mins</td>
          <td>${s.total_marks}</td>
          <td>${s.passing_marks}</td>
          <td>${s.room || '—'}</td>
        </tr>`;
      }).join('');
    }
  }

  $('scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const examId = $('dsExamSelect').value;
    if (!examId) return showToast('Select an exam first', 'error');
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      await api(`/exams/${examId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          subjectId: $('schedSubject').value,
          examDate: $('schedDate').value,
          startTime: $('schedStart').value,
          endTime: $('schedEnd').value,
          durationMins: Number($('schedDuration').value),
          totalMarks: Number($('schedTotal').value),
          passingMarks: Number($('schedPassing').value),
          room: $('schedRoom').value || null,
        }),
      });
      $('scheduleForm').reset();
      $('schedDuration').value = 120; $('schedTotal').value = 100; $('schedPassing').value = 33;
      showToast('Added to date sheet.');
      renderDateSheet();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  $('dsPrintBtn').addEventListener('click', () => window.print());

  // ===================================================================
  // CLASSES, SECTIONS & SUBJECTS (Phase 2)
  // ===================================================================
  async function loadClassesView() {
    try {
      await loadLookups({ force: true });
      fillSelect($('secClassSelect'), classes);
      fillSelect($('subjClassSelect'), classes, { placeholder: 'Link to class (optional)' });

      const tbody = $('classesBody');
      tbody.innerHTML = classes.map((c) => `
        <tr><td>${c.name}</td><td>${c.section_count ?? sectionsForClass(c.id).length}</td><td>${c.student_count ?? '—'}</td></tr>
      `).join('') || '<tr><td colspan="3" class="empty-row">No classes yet.</td></tr>';

      renderSectionsTable();
      $('secClassSelect').onchange = renderSectionsTable;

      const subjBody = $('subjectsBody');
      subjBody.innerHTML = subjects.map((s) => `<tr><td>${s.name}</td><td>${s.code || '—'}</td></tr>`).join('') || '<tr><td colspan="2" class="empty-row">No subjects yet.</td></tr>';
    } catch (err) { handleAuthError(err); }
  }

  function renderSectionsTable() {
    const classId = $('secClassSelect').value;
    const tbody = $('sectionsBody');
    const list = classId ? sectionsForClass(classId) : sections;
    tbody.innerHTML = list.map((s) => `<tr><td>${s.class_name}</td><td>${s.name}</td></tr>`).join('') || '<tr><td colspan="2" class="empty-row">No sections yet.</td></tr>';
  }

  $('classForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      await api('/classes', {
        method: 'POST',
        body: JSON.stringify({ name: $('newClassName').value.trim(), sortOrder: Number($('newClassOrder').value) || 0 }),
      });
      $('classForm').reset();
      showToast('Class added.');
      loadClassesView();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  $('sectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      await api(`/classes/${$('secClassSelect').value}/sections`, {
        method: 'POST',
        body: JSON.stringify({ name: $('newSectionName').value.trim() }),
      });
      $('newSectionName').value = '';
      showToast('Section added.');
      loadClassesView();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  $('subjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      const subject = await api('/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: $('newSubjectName').value.trim(), code: $('newSubjectCode').value.trim() || null }),
      });
      const classId = $('subjClassSelect').value;
      if (classId) {
        await api(`/classes/${classId}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) });
      }
      $('subjectForm').reset();
      showToast('Subject added.');
      loadClassesView();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  // ===================================================================
  // STUDENTS (Phase 2)
  // ===================================================================
  async function loadStudentsView() {
    try {
      await loadLookups();
      fillSelect($('stuClass'), classes);
      fillSelect($('stuSection'), sectionsForClass($('stuClass').value), { placeholder: '—' });
      classSectionSelects($('stuClass'), $('stuSection'), '—');
      fillSelect($('stuFilterClass'), classes, { placeholder: 'All classes' });
      $('stuFilterClass').onchange = renderStudentsTable;
      await renderStudentsTable();
    } catch (err) { handleAuthError(err); }
  }

  async function renderStudentsTable() {
    const classId = $('stuFilterClass').value;
    const tbody = $('studentsBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Loading…</td></tr>';
    studentsCache = await api(`/students${classId ? `?classId=${classId}` : ''}`);
    tbody.innerHTML = studentsCache.map((s) => `
      <tr>
        <td>${s.admission_no}</td><td>${s.full_name}</td><td>${s.roll_number || '—'}</td>
        <td>${s.class_name || '—'}</td><td>${s.section_name || '—'}</td><td>${s.status}</td>
        <td class="table-actions"><button class="btn btn-ghost btn-sm" data-del-student="${s.id}">Delete</button></td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="empty-row">No students yet.</td></tr>';
    tbody.querySelectorAll('[data-del-student]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!(await showConfirm('Remove this student from records?'))) return;
        try {
          await api(`/students/${btn.getAttribute('data-del-student')}`, { method: 'DELETE' });
          showToast('Student removed.');
          renderStudentsTable();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  }

  $('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      await api('/students', {
        method: 'POST',
        body: JSON.stringify({
          admissionNo: $('stuAdmission').value.trim(),
          fullName: $('stuName').value.trim(),
          rollNumber: $('stuRoll').value.trim() || null,
          classId: $('stuClass').value,
          sectionId: $('stuSection').value || null,
          guardianName: $('stuGuardian').value.trim() || null,
        }),
      });
      $('studentForm').reset();
      showToast('Student added.');
      renderStudentsTable();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  // ===================================================================
  // QUESTION PAPERS (Phase 5)
  // ===================================================================
  let currentPaperId = null;

  async function loadPapersView() {
    try {
      await loadLookups();
      if (!examsList.length) examsList = await api('/exams');
      fillSelect($('paperExamSelect'), examsList, { labelFn: examLabel });
      fillSelect($('paperSubjectSelect'), subjects);
      $('paperExamSelect').onchange = renderPapersTable;
      $('paperSubjectSelect').onchange = renderPapersTable;
      $('questionsPanel').style.display = 'none';
      renderPapersTable();
    } catch (err) { handleAuthError(err); }
  }

  async function renderPapersTable() {
    const examId = $('paperExamSelect').value;
    const subjectId = $('paperSubjectSelect').value;
    const tbody = $('papersBody');
    if (!examId) { tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Select an exam &amp; subject</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Loading…</td></tr>';
    const papers = (await api(`/exams/${examId}/papers`)).filter((p) => !subjectId || p.subject_id === subjectId);
    tbody.innerHTML = papers.map((p) => `
      <tr>
        <td>${p.version}</td><td>${p.title}</td><td>${p.total_marks}</td>
        <td class="table-actions">
          <button class="btn btn-ghost btn-sm" data-open-paper="${p.id}" data-title="${p.title} (${p.version})">Questions</button>
          <button class="btn btn-ghost btn-sm" data-del-paper="${p.id}">Delete</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="empty-row">No papers yet for this exam/subject.</td></tr>';

    tbody.querySelectorAll('[data-open-paper]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentPaperId = btn.getAttribute('data-open-paper');
        $('questionsPaperTitle').textContent = btn.getAttribute('data-title');
        $('questionsPanel').style.display = 'block';
        renderQuestionsTable(examId);
      });
    });
    tbody.querySelectorAll('[data-del-paper]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!(await showConfirm('Delete this paper and its questions?'))) return;
        try {
          await api(`/exams/${examId}/papers/${btn.getAttribute('data-del-paper')}`, { method: 'DELETE' });
          showToast('Paper deleted.');
          renderPapersTable();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  }

  async function renderQuestionsTable(examId) {
    const tbody = $('questionsBody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Loading…</td></tr>';
    const questions = await api(`/exams/${examId}/papers/${currentPaperId}/questions`);
    tbody.innerHTML = questions.map((q, i) => `
      <tr>
        <td>${i + 1}</td><td>${q.question_type}</td><td>${q.question_text}</td><td>${q.marks}</td>
        <td><button class="btn btn-ghost btn-sm" data-del-q="${q.id}">Delete</button></td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="empty-row">No questions added yet.</td></tr>';
    tbody.querySelectorAll('[data-del-q]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/exams/${examId}/papers/${currentPaperId}/questions/${btn.getAttribute('data-del-q')}`, { method: 'DELETE' });
          renderQuestionsTable(examId);
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  }

  $('paperForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const examId = $('paperExamSelect').value;
    const subjectId = $('paperSubjectSelect').value;
    if (!examId || !subjectId) return showToast('Select an exam and subject first', 'error');
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      await api(`/exams/${examId}/papers`, {
        method: 'POST',
        body: JSON.stringify({
          subjectId, version: $('paperVersion').value, title: $('paperTitle').value.trim(),
          totalMarks: Number($('paperTotalMarks').value) || 100,
        }),
      });
      $('paperTitle').value = '';
      showToast('Paper created.');
      renderPapersTable();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  $('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const examId = $('paperExamSelect').value;
    if (!currentPaperId) return;
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      const type = $('qType').value;
      const optionsRaw = $('qOptions').value.trim();
      await api(`/exams/${examId}/papers/${currentPaperId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          questionType: type,
          questionText: $('qText').value.trim(),
          options: type === 'mcq' && optionsRaw ? optionsRaw.split(',').map((s) => s.trim()) : null,
          correctAnswer: $('qAnswer').value.trim() || null,
          marks: Number($('qMarks').value) || 1,
        }),
      });
      $('questionForm').reset();
      renderQuestionsTable(examId);
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  // ===================================================================
  // Helper: get roster (students) for an exam's class/section
  // ===================================================================
  async function rosterForExam(examId) {
    const exam = examsList.find((e) => e.id === examId) || await api(`/exams/${examId}`);
    const qs = exam.section_id ? `?classId=${exam.class_id}&sectionId=${exam.section_id}` : `?classId=${exam.class_id}`;
    return api(`/students${qs}`);
  }

  // ===================================================================
  // ATTENDANCE (Phase 6)
  // ===================================================================
  async function loadAttendanceView() {
    try {
      await loadLookups();
      if (!examsList.length) examsList = await api('/exams');
      fillSelect($('attExamSelect'), examsList, { labelFn: examLabel });
      fillSelect($('attSubjectSelect'), subjects);
      $('attExamSelect').onchange = renderAttendanceTable;
      $('attSubjectSelect').onchange = renderAttendanceTable;
      renderAttendanceTable();
    } catch (err) { handleAuthError(err); }
  }

  async function renderAttendanceTable() {
    const examId = $('attExamSelect').value;
    const subjectId = $('attSubjectSelect').value;
    const tbody = $('attendanceBody');
    if (!examId || !subjectId) { tbody.innerHTML = '<tr><td colspan="3" class="empty-row">Select an exam &amp; subject</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="3" class="empty-row">Loading…</td></tr>';
    const [roster, existing] = await Promise.all([rosterForExam(examId), api(`/exams/${examId}/attendance/${subjectId}`)]);
    const statusMap = {};
    existing.forEach((a) => { statusMap[a.student_id] = a.status; });
    tbody.innerHTML = roster.map((s) => `
      <tr>
        <td>${s.roll_number || '—'}</td><td>${s.full_name}</td>
        <td>
          <select data-att-student="${s.id}">
            <option value="present" ${statusMap[s.id] !== 'absent' ? 'selected' : ''}>Present</option>
            <option value="absent" ${statusMap[s.id] === 'absent' ? 'selected' : ''}>Absent</option>
          </select>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="3" class="empty-row">No students in this class/section yet.</td></tr>';
  }

  $('attSaveBtn').addEventListener('click', async () => {
    const examId = $('attExamSelect').value;
    const subjectId = $('attSubjectSelect').value;
    if (!examId || !subjectId) return;
    const entries = [...document.querySelectorAll('[data-att-student]')].map((el) => ({
      studentId: el.getAttribute('data-att-student'), status: el.value,
    }));
    setBtnLoading($('attSaveBtn'), true);
    try {
      await api(`/exams/${examId}/attendance/${subjectId}`, { method: 'POST', body: JSON.stringify({ entries }) });
      showToast('Attendance saved.');
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading($('attSaveBtn'), false); }
  });

  // ===================================================================
  // MARKS ENTRY (Phase 7 & 8)
  // ===================================================================
  async function loadMarksView() {
    try {
      await loadLookups();
      if (!examsList.length) examsList = await api('/exams');
      fillSelect($('marksExamSelect'), examsList, { labelFn: examLabel });
      fillSelect($('marksSubjectSelect'), subjects);
      $('marksExamSelect').onchange = renderMarksTable;
      $('marksSubjectSelect').onchange = renderMarksTable;
      renderMarksTable();
    } catch (err) { handleAuthError(err); }
  }

  async function renderMarksTable() {
    const examId = $('marksExamSelect').value;
    const subjectId = $('marksSubjectSelect').value;
    const tbody = $('marksBody');
    if (!examId || !subjectId) { tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Select an exam &amp; subject</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Loading…</td></tr>';
    const [roster, existing] = await Promise.all([rosterForExam(examId), api(`/exams/${examId}/marks/${subjectId}`)]);
    const markMap = {};
    existing.forEach((m) => { markMap[m.student_id] = m; });
    tbody.innerHTML = roster.map((s) => {
      const m = markMap[s.id];
      return `<tr>
        <td>${s.roll_number || '—'}</td><td>${s.full_name}</td>
        <td><input type="checkbox" data-abs-student="${s.id}" ${m && m.is_absent ? 'checked' : ''} /></td>
        <td><input type="number" step="0.01" data-marks-student="${s.id}" value="${m && m.marks_obtained !== null && m.marks_obtained !== undefined ? m.marks_obtained : ''}" style="width:90px" /></td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" class="empty-row">No students in this class/section yet.</td></tr>';
  }

  $('marksSaveBtn').addEventListener('click', async () => {
    const examId = $('marksExamSelect').value;
    const subjectId = $('marksSubjectSelect').value;
    if (!examId || !subjectId) return;
    const entries = [...document.querySelectorAll('[data-marks-student]')].map((el) => {
      const studentId = el.getAttribute('data-marks-student');
      const isAbsent = document.querySelector(`[data-abs-student="${studentId}"]`).checked;
      return { studentId, marksObtained: el.value === '' ? null : Number(el.value), isAbsent };
    });
    setBtnLoading($('marksSaveBtn'), true);
    try {
      await api(`/exams/${examId}/marks/${subjectId}`, { method: 'POST', body: JSON.stringify({ entries }) });
      showToast('Marks saved.');
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading($('marksSaveBtn'), false); }
  });

  // ===================================================================
  // RESULTS & REPORT CARDS (Phase 8 & 9)
  // ===================================================================
  async function loadResultsView() {
    try {
      if (!examsList.length) examsList = await api('/exams');
      fillSelect($('resultsExamSelect'), examsList, { labelFn: examLabel });
      $('resultsExamSelect').onchange = renderResultsTable;
      $('resultCardPanel').style.display = 'none';
      renderResultsTable();
    } catch (err) { handleAuthError(err); }
  }

  async function renderResultsTable() {
    const examId = $('resultsExamSelect').value;
    const tbody = $('resultsBody');
    if (!examId) { tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Select an exam</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Loading…</td></tr>';
    const { results } = await api(`/exams/${examId}/results`);
    tbody.innerHTML = results.map((r) => `
      <tr>
        <td>${r.rollNumber || '—'}</td><td>${r.fullName}</td>
        <td>${r.obtainedTotal} / ${r.maxTotal}</td><td>${r.percentage}%</td><td>${r.grade}</td>
        <td>${r.passFail === 'pass' ? '<span class="badge-pass">PASS</span>' : '<span class="badge-fail">FAIL</span>'}</td>
        <td>${r.position || '—'}</td>
        <td><button class="btn btn-ghost btn-sm" data-view-card="${r.studentId}">View Card</button></td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="empty-row">No students found for this exam.</td></tr>';

    tbody.querySelectorAll('[data-view-card]').forEach((btn) => {
      btn.addEventListener('click', () => renderResultCard(examId, btn.getAttribute('data-view-card')));
    });
  }

  async function renderResultCard(examId, studentId) {
    const [result, student, exam, settings] = await Promise.all([
      api(`/exams/${examId}/results/${studentId}`),
      api(`/students/${studentId}`),
      api(`/exams/${examId}`),
      api('/settings'),
    ]);
    $('resultCardPanel').style.display = 'block';
    $('resultCard').innerHTML = `
      <div class="result-card-header">
        <img src="/img/mgs-logo.png" alt="Moon Grammar School logo" class="brand-logo" style="width:64px" />
        <h2>${settings.school_name || 'Moon Grammar School'}</h2>
        <p>Result Card — ${exam.name}</p>
        <p class="school-contact">1037-E-1 Johar Town, Lahore &nbsp;·&nbsp; 0308-6010310</p>
      </div>
      <div class="result-card-meta">
        <div><strong>Name:</strong> ${student.full_name}</div>
        <div><strong>Admission No:</strong> ${student.admission_no}</div>
        <div><strong>Class:</strong> ${student.class_name || ''} ${student.section_name ? '- ' + student.section_name : ''}</div>
        <div><strong>Roll Number:</strong> ${student.roll_number || '—'}</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Subject</th><th>Obtained</th><th>Total</th><th>Grade</th></tr></thead>
        <tbody>
          ${result.subjects.map((s) => `<tr>
            <td>${s.subjectName}</td>
            <td>${s.isAbsent ? 'Absent' : (s.marksObtained ?? '—')}</td>
            <td>${s.totalMarks}</td>
            <td>${s.grade}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="result-card-summary">
        <div><strong>${result.obtainedTotal}/${result.maxTotal}</strong>Total</div>
        <div><strong>${result.percentage}%</strong>Percentage</div>
        <div><strong>${result.grade}</strong>Grade</div>
        <div><strong>${result.passFail === 'pass' ? 'PASS' : 'FAIL'}</strong>Result</div>
      </div>
      <div class="remarks-box">
        <p><strong>Teacher's Remarks:</strong> ${result.remarks.teacher_remark || '—'}</p>
        <p><strong>Principal's Remarks:</strong> ${result.remarks.principal_remark || '—'}</p>
      </div>
    `;
    $('resultCardPanel').scrollIntoView({ behavior: 'smooth' });
  }

  $('cardPrintBtn').addEventListener('click', () => window.print());

  // ===================================================================
  // GAZETTE (Phase 10)
  // ===================================================================
  async function loadGazetteView() {
    try {
      if (!examsList.length) examsList = await api('/exams');
      fillSelect($('gazExamSelect'), examsList, { labelFn: examLabel });
      $('gazExamSelect').onchange = renderGazette;
      renderGazette();
    } catch (err) { handleAuthError(err); }
  }

  async function renderGazette() {
    const examId = $('gazExamSelect').value;
    const el = $('gazetteContent');
    if (!examId) { el.innerHTML = '<p class="empty-row">Select an exam.</p>'; return; }
    el.innerHTML = '<p class="empty-row">Loading…</p>';
    const [g, settings] = await Promise.all([
      api(`/exams/${examId}/gazette`),
      api('/settings'),
    ]);
    el.innerHTML = `
      <div class="gazette-header">
        <img src="/img/mgs-logo.png" alt="Moon Grammar School logo" class="brand-logo" />
        <h2>${settings.school_name || 'Moon Grammar School'}</h2>
        <p class="school-contact">1037-E-1 Johar Town, Lahore &nbsp;·&nbsp; 0308-6010310</p>
      </div>
      <h3>${examLabel(examsList.find((e) => e.id === examId) || g.exam)} — Result Gazette</h3>
      <div class="gazette-stats">
        <div class="stat-card"><span class="stat-label">Total Students</span><span class="stat-value">${g.totalStudents}</span></div>
        <div class="stat-card accent-live"><span class="stat-label">Passed</span><span class="stat-value">${g.passCount}</span></div>
        <div class="stat-card"><span class="stat-label">Failed</span><span class="stat-value">${g.failCount}</span></div>
        <div class="stat-card accent-gold"><span class="stat-label">Pass %</span><span class="stat-value">${g.passPercentage}%</span></div>
      </div>
      <div class="panel-grid">
        <div>
          <h3>Top Positions</h3>
          <table class="data-table">
            <thead><tr><th>Position</th><th>Name</th><th>%</th></tr></thead>
            <tbody>${g.topPositions.map((p) => `<tr><td>${p.position}</td><td>${p.fullName}</td><td>${p.percentage}%</td></tr>`).join('') || '<tr><td colspan="3" class="empty-row">—</td></tr>'}</tbody>
          </table>
        </div>
        <div>
          <h3>Subject Toppers</h3>
          <table class="data-table">
            <thead><tr><th>Subject</th><th>Student</th><th>Marks</th></tr></thead>
            <tbody>${g.subjectToppers.map((s) => `<tr><td>${s.subjectName}</td><td>${s.studentName}</td><td>${s.marksObtained}/${s.totalMarks}</td></tr>`).join('') || '<tr><td colspan="3" class="empty-row">—</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  $('gazPrintBtn').addEventListener('click', () => window.print());

  // ===================================================================
  // REPORTS (Phase 11)
  // ===================================================================
  async function loadReportsView() {
    try {
      if (!examsList.length) examsList = await api('/exams');
      const tbody = $('reportsBody');
      tbody.innerHTML = examsList.map((ex) => `
        <tr>
          <td>${ex.name}</td><td>${ex.class_name || ''}</td><td>${statusBadge(ex.status)}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-goto-results="${ex.id}">Results</button>
            <button class="btn btn-ghost btn-sm" data-goto-gazette="${ex.id}">Gazette</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="empty-row">No exams yet.</td></tr>';

      tbody.querySelectorAll('[data-goto-results]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          navigateTo('results');
          await loadResultsView();
          $('resultsExamSelect').value = btn.getAttribute('data-goto-results');
          renderResultsTable();
        });
      });
      tbody.querySelectorAll('[data-goto-gazette]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          navigateTo('gazette');
          await loadGazetteView();
          $('gazExamSelect').value = btn.getAttribute('data-goto-gazette');
          renderGazette();
        });
      });
    } catch (err) { handleAuthError(err); }
  }

  // ===================================================================
  // PROMOTION (Phase 12)
  // ===================================================================
  async function loadPromotionView() {
    try {
      await loadLookups();
      fillSelect($('promoFromClass'), classes);
      fillSelect($('promoToClass'), classes);
      fillSelect($('promoToSection'), sectionsForClass($('promoToClass').value), { placeholder: '—' });
      classSectionSelects($('promoToClass'), $('promoToSection'), '—');
      fillSelect($('promoToSession'), sessionsList);
      $('promoFromClass').onchange = renderPromotionRoster;
      $('promoSelectAll').onchange = (e) => {
        document.querySelectorAll('[data-promo-student]').forEach((c) => { c.checked = e.target.checked; });
      };
      await renderPromotionRoster();
      renderPromotionHistoryHint();
    } catch (err) { handleAuthError(err); }
  }

  async function renderPromotionRoster() {
    const classId = $('promoFromClass').value;
    const tbody = $('promotionBody');
    if (!classId) { tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Select a class</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Loading…</td></tr>';
    const roster = await api(`/students?classId=${classId}`);
    tbody.innerHTML = roster.map((s) => `
      <tr>
        <td><input type="checkbox" data-promo-student="${s.id}" /></td>
        <td>${s.admission_no}</td><td>${s.full_name}</td><td>${s.class_name || ''}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="empty-row">No students in this class.</td></tr>';
  }

  function renderPromotionHistoryHint() {
    $('promoHistoryBody').innerHTML = '<tr><td colspan="5" class="empty-row">Select a student below to view individual history — bulk history log coming in a later phase.</td></tr>';
  }

  $('promoBtn').addEventListener('click', async () => {
    const fromClassId = $('promoFromClass').value;
    const toClassId = $('promoToClass').value;
    const toSectionId = $('promoToSection').value || null;
    const toSessionId = $('promoToSession').value;
    const selected = [...document.querySelectorAll('[data-promo-student]:checked')].map((c) => c.getAttribute('data-promo-student'));
    if (!selected.length) return showToast('Select at least one student', 'error');
    if (!toClassId || !toSessionId) return showToast('Select a target class and session', 'error');
    if (!(await showConfirm(`Promote ${selected.length} student(s) to the selected class?`, { confirmLabel: 'Promote', danger: false }))) return;
    setBtnLoading($('promoBtn'), true);
    try {
      const entries = selected.map((studentId) => ({
        studentId, fromClassId, toClassId, toSectionId, toSessionId, status: 'promoted',
      }));
      await api('/promotions/bulk', { method: 'POST', body: JSON.stringify({ entries }) });
      showToast(`${selected.length} student(s) promoted.`);
      renderPromotionRoster();
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading($('promoBtn'), false); }
  });

  // ===================================================================
  // SETTINGS (Phase 14)
  // ===================================================================
  async function loadSettingsView() {
    try {
      const settings = await api('/settings');
      $('setSchoolName').value = settings.school_name || '';
      $('setGradeScale').value = settings.grade_scale || '';
      $('setTestApi').value = settings.mgs_test_system_api_url || '';
      $('setFeeApi').value = settings.mgs_fee_system_api_url || '';
    } catch (err) { handleAuthError(err); }
  }

  $('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = submitBtnOf(e);
    setBtnLoading(btn, true);
    try {
      await Promise.all([
        api('/settings/school_name', { method: 'PUT', body: JSON.stringify({ value: $('setSchoolName').value }) }),
        api('/settings/grade_scale', { method: 'PUT', body: JSON.stringify({ value: $('setGradeScale').value }) }),
        api('/settings/mgs_test_system_api_url', { method: 'PUT', body: JSON.stringify({ value: $('setTestApi').value }) }),
        api('/settings/mgs_fee_system_api_url', { method: 'PUT', body: JSON.stringify({ value: $('setFeeApi').value }) }),
      ]);
      showToast('Settings saved.');
    } catch (err) { showToast(err.message, 'error'); } finally { setBtnLoading(btn, false); }
  });

  // ----- Boot -----
  if (token && currentUser) {
    showApp();
  } else {
    showAuth();
  }
})();
