const CONFIG_PATH = './supabase-config.json';
const REPORT_TYPE_LABELS = {
  1: 'Ferien',
  2: 'Krankheit',
  3: 'Militär',
  4: 'Unfall',
  5: 'Feiertag',
  6: 'ÜK',
  7: 'Berufsschule'
};
const ABSENCE_TYPE_ORDER = [1, 2, 3, 4, 5, 6, 7];

const WEEKLY_REPORT_COLUMNS = [
  'id',
  'profile_id',
  'work_date',
  'year',
  'kw',
  'project_name',
  'commission_number',
  'total_work_minutes',
  'total_adjusted_work_minutes',
  'start_time',
  'end_time',
  'lunch_break_minutes',
  'additional_break_minutes',
  'expenses_amount',
  'other_costs_amount',
  'expense_note',
  'notes',
  'attachments',
  'abz_typ'
].join(', ');
const state = {
  supabase: null,
  session: null,
  weekOffset: 0,
  reports: []
};

const elements = {
  serviceStatus: document.getElementById('serviceStatus'),
  weekLabel: document.getElementById('weekLabel'),
  prevWeekBtn: document.getElementById('prevWeekBtn'),
  currentWeekBtn: document.getElementById('currentWeekBtn'),
  nextWeekBtn: document.getElementById('nextWeekBtn'),
  reportTableBody: document.getElementById('reportTableBody'),
  reportEmpty: document.getElementById('reportEmpty'),
  addReportRowBtn: document.getElementById('addReportRowBtn'),
  absenceTableBody: document.getElementById('absenceTableBody'),
  absenceEmpty: document.getElementById('absenceEmpty'),
  addAbsenceRowBtn: document.getElementById('addAbsenceRowBtn')
};

function refreshServiceIcons() {
  if (!window.lucide?.createIcons) return;
  window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' }, nameAttr: 'data-lucide' });
}

function setStatus(message, type = 'neutral') {
  if (!elements.serviceStatus) return;
  elements.serviceStatus.textContent = message;
  elements.serviceStatus.dataset.type = type;
}

function parseLocalDate(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-').map(Number);
  if (!year || !month || !day) return new Date(NaN);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekNumber(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
}

function getWeekDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + (state.weekOffset * 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatWeekLabel(days) {
  const formatter = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `KW ${getWeekNumber(days[0])} · ${formatter.format(days[0])} – ${formatter.format(days[6])}`;
}

function parseHoursInput(value) {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;
  const hours = Number(normalized);
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return null;
  return Math.round(hours * 60);
}

function formatHours(minutes) {
  const hours = Number(minutes || 0) / 60;
  if (!hours) return '';
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace('.', ',')} h`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildReportMatrixRows(reports) {
  const grouped = new Map();
  (reports || []).forEach((entry) => {
    if (Number(entry?.abz_typ || 0) !== 0) return;
    const workDate = parseLocalDate(entry.work_date);
    const dayIndex = (workDate.getDay() + 6) % 7;
    if (dayIndex < 0 || dayIndex > 6) return;

    const projectName = entry.project_name || '—';
    const commissionNumber = entry.commission_number || '—';
    const key = `${projectName}|${commissionNumber}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectName,
        commissionNumber,
        days: Array(7).fill(0),
        total: 0,
        entriesByDay: Array.from({ length: 7 }, () => [])
      });
    }
    const row = grouped.get(key);
    const minutes = Number(entry.total_work_minutes || 0);
    row.days[dayIndex] += minutes;
    row.total += minutes;
    row.entriesByDay[dayIndex].push(entry);
  });
  return Array.from(grouped.values()).sort((a, b) =>
    a.projectName.localeCompare(b.projectName, 'de') || a.commissionNumber.localeCompare(b.commissionNumber, 'de')
  );
}

function buildAbsenceMatrixRows(reports) {
  const grouped = new Map();
  ABSENCE_TYPE_ORDER.forEach((type) => {
    grouped.set(type, {
      type,
      label: REPORT_TYPE_LABELS[type],
      days: Array(7).fill(0),
      total: 0,
      entriesByDay: Array.from({ length: 7 }, () => [])
    });
  });

  (reports || []).forEach((entry) => {
    const type = Number(entry?.abz_typ || 0);
    if (!REPORT_TYPE_LABELS[type]) return;
    const workDate = parseLocalDate(entry.work_date);
    const dayIndex = (workDate.getDay() + 6) % 7;
    if (dayIndex < 0 || dayIndex > 6) return;

    const row = grouped.get(type);
    const minutes = Number(entry.total_work_minutes || 0);
    row.days[dayIndex] += minutes;
    row.total += minutes;
    row.entriesByDay[dayIndex].push(entry);
  });

  return Array.from(grouped.values()).filter((row) => row.total > 0);
}

function renderReportMatrix(reports) {
  const rows = buildReportMatrixRows(reports);
  elements.reportEmpty.hidden = rows.length > 0;
  elements.reportTableBody.innerHTML = rows.map((row, rowIndex) => `
    <tr>
      <th scope="row">${escapeHtml(row.projectName)}</th>
      <td class="commission-cell">${escapeHtml(row.commissionNumber)}</td>
      ${row.days.map((minutes, dayIndex) => `<td><button type="button" class="matrix-cell-btn ${minutes ? 'has-hours' : ''}" data-kind="report" data-row-index="${rowIndex}" data-day-index="${dayIndex}" aria-label="Rapportstunden bearbeiten">${escapeHtml(formatHours(minutes)) || '<span aria-hidden="true">+</span>'}</button></td>`).join('')}
      <td class="total-cell">${escapeHtml(formatHours(row.total))}</td>
    </tr>
  `).join('');
  elements.reportTableBody._matrixRows = rows;
}

function renderAbsenceMatrix(reports) {
  const rows = buildAbsenceMatrixRows(reports);
  elements.absenceEmpty.hidden = rows.length > 0;
  elements.absenceTableBody.innerHTML = rows.map((row, rowIndex) => `
    <tr>
      <th scope="row">${escapeHtml(row.label)}</th>
      ${row.days.map((minutes, dayIndex) => `<td><button type="button" class="matrix-cell-btn ${minutes ? 'has-hours' : ''}" data-kind="absence" data-row-index="${rowIndex}" data-day-index="${dayIndex}" aria-label="Absenzstunden bearbeiten">${escapeHtml(formatHours(minutes)) || '<span aria-hidden="true">+</span>'}</button></td>`).join('')}
      <td class="total-cell">${escapeHtml(formatHours(row.total))}</td>
    </tr>
  `).join('');
  elements.absenceTableBody._matrixRows = rows;
}

function renderMatrices(reports) {
  const days = getWeekDays();
  elements.weekLabel.textContent = formatWeekLabel(days);
  renderReportMatrix(reports);
  renderAbsenceMatrix(reports);
}


function buildMatrixPayload({ workDate, minutes, projectName = '', commissionNumber = '', absenceType = 0 }) {
  const parsedDate = parseLocalDate(workDate);
  return {
    profile_id: state.session.user.id,
    work_date: workDate,
    year: parsedDate.getFullYear(),
    kw: getWeekNumber(parsedDate),
    project_name: projectName,
    commission_number: commissionNumber || (absenceType ? REPORT_TYPE_LABELS[absenceType] : ''),
    start_time: '00:00',
    end_time: '00:00',
    lunch_break_minutes: 0,
    additional_break_minutes: 0,
    total_work_minutes: minutes,
    total_adjusted_work_minutes: minutes,
    expenses_amount: 0,
    other_costs_amount: 0,
    expense_note: null,
    notes: null,
    attachments: [],
    abz_typ: absenceType
  };
}

async function saveMatrixReport(payload, existingEntry = null) {
  setStatus('Rapport wird gespeichert …');
  const query = existingEntry?.id
    ? state.supabase.from('weekly_reports').update(payload).eq('id', existingEntry.id).eq('profile_id', state.session.user.id)
    : state.supabase.from('weekly_reports').insert(payload);
  const { error } = await query;
  if (error) throw error;
  await loadReports();
}

async function editMatrixCell(kind, row, dayIndex) {
  const days = getWeekDays();
  const existingEntry = row.entriesByDay[dayIndex][0] || null;
  const currentHours = row.days[dayIndex] ? String(row.days[dayIndex] / 60).replace('.', ',') : '';
  const value = window.prompt('Stunden erfassen (Spesen und Mittagsspesen sind in der Matrix immer aus):', currentHours);
  if (value === null) return;
  const minutes = parseHoursInput(value);
  if (minutes === null || minutes <= 0) {
    window.alert('Bitte Stunden zwischen 0,25 und 24 erfassen.');
    return;
  }
  const payload = buildMatrixPayload({
    workDate: formatLocalDate(days[dayIndex]),
    minutes,
    projectName: kind === 'report' ? row.projectName : row.label,
    commissionNumber: kind === 'report' ? row.commissionNumber : row.label,
    absenceType: kind === 'absence' ? row.type : 0
  });
  await saveMatrixReport(payload, existingEntry);
}

async function addMatrixRows(kind) {
  const isAbsence = kind === 'absence';
  const projectName = isAbsence
    ? window.prompt(`Absenztyp (${ABSENCE_TYPE_ORDER.map((type) => `${type}=${REPORT_TYPE_LABELS[type]}`).join(', ')}):`, '1')
    : window.prompt('Projektname:');
  if (projectName === null) return;
  const absenceType = isAbsence ? Number(projectName) : 0;
  if (isAbsence && !REPORT_TYPE_LABELS[absenceType]) {
    window.alert('Bitte einen gültigen Absenztyp wählen.');
    return;
  }
  const commissionNumber = isAbsence ? REPORT_TYPE_LABELS[absenceType] : window.prompt('Kommissionsnummer:');
  if (commissionNumber === null) return;
  if (!isAbsence && (!projectName.trim() || !commissionNumber.trim())) {
    window.alert('Bitte Projektname und Kommissionsnummer erfassen.');
    return;
  }
  const label = isAbsence ? REPORT_TYPE_LABELS[absenceType] : projectName.trim();
  const days = getWeekDays();
  const dayLabels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const payloads = [];
  for (let index = 0; index < days.length; index += 1) {
    const value = window.prompt(`${dayLabels[index]} Stunden (leer = 0):`, '');
    if (value === null) return;
    const minutes = parseHoursInput(value || '0');
    if (minutes === null) {
      window.alert('Bitte nur gültige Stunden erfassen.');
      return;
    }
    if (minutes > 0) {
      payloads.push(buildMatrixPayload({ workDate: formatLocalDate(days[index]), minutes, projectName: label, commissionNumber: commissionNumber.trim(), absenceType }));
    }
  }
  if (!payloads.length) return;
  setStatus('Rapporte werden gespeichert …');
  const { error } = await state.supabase.from('weekly_reports').insert(payloads);
  if (error) throw error;
  await loadReports();
}

async function handleMatrixClick(event) {
  const button = event.target.closest('.matrix-cell-btn');
  if (!button) return;
  const rows = button.dataset.kind === 'absence' ? elements.absenceTableBody._matrixRows : elements.reportTableBody._matrixRows;
  const row = rows?.[Number(button.dataset.rowIndex)];
  if (!row) return;
  try { await editMatrixCell(button.dataset.kind, row, Number(button.dataset.dayIndex)); }
  catch (error) { console.error(error); setStatus(error.message || 'Rapport konnte nicht gespeichert werden.', 'danger'); }
}

async function loadConfig() {
  const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('Supabase-Konfiguration konnte nicht geladen werden.');
  return response.json();
}

async function loadReports() {
  if (!state.supabase || !state.session?.user) {
    renderMatrices([]);
    setStatus('Bitte zuerst anmelden.', 'danger');
    return;
  }
  setStatus('Rapporte und Absenzen werden geladen …');
  const days = getWeekDays();
  const { data, error } = await state.supabase
    .from('weekly_reports')
    .select(WEEKLY_REPORT_COLUMNS)
    .eq('profile_id', state.session.user.id)
    .gte('work_date', formatLocalDate(days[0]))
    .lte('work_date', formatLocalDate(days[6]))
    .order('project_name', { ascending: true })
    .order('commission_number', { ascending: true })
    .order('work_date', { ascending: true });

  if (error) throw error;
  state.reports = data || [];
  renderMatrices(state.reports);
  setStatus('Rapporte und Absenzen geladen', 'success');
}

async function initServicePage() {
  refreshServiceIcons();
  try {
    const config = await loadConfig();
    if (!window.supabase?.createClient) {
      throw new Error('Supabase-Bibliothek konnte nicht geladen werden. Bitte Seite neu laden.');
    }
    state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await state.supabase.auth.getSession();
    if (error) throw error;
    state.session = data?.session || null;
    if (!state.session?.user) {
      setStatus('Bitte zuerst anmelden.', 'danger');
      renderMatrices([]);
      return;
    }
    await loadReports();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Rapporte konnten nicht geladen werden.', 'danger');
    renderMatrices([]);
  }
}

async function reloadReportsSafely() {
  try {
    await loadReports();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Rapporte konnten nicht geladen werden.', 'danger');
    renderMatrices([]);
  }
}

elements.reportTableBody?.addEventListener('click', handleMatrixClick);
elements.absenceTableBody?.addEventListener('click', handleMatrixClick);
elements.addReportRowBtn?.addEventListener('click', () => addMatrixRows('report').catch((error) => { console.error(error); setStatus(error.message || 'Rapporte konnten nicht gespeichert werden.', 'danger'); }));
elements.addAbsenceRowBtn?.addEventListener('click', () => addMatrixRows('absence').catch((error) => { console.error(error); setStatus(error.message || 'Absenzen konnten nicht gespeichert werden.', 'danger'); }));

elements.prevWeekBtn?.addEventListener('click', async () => {
  state.weekOffset -= 1;
  await reloadReportsSafely();
});

elements.currentWeekBtn?.addEventListener('click', async () => {
  state.weekOffset = 0;
  await reloadReportsSafely();
});

elements.nextWeekBtn?.addEventListener('click', async () => {
  state.weekOffset += 1;
  await reloadReportsSafely();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServicePage, { once: true });
} else {
  initServicePage();
}
