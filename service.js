const CONFIG_PATH = './supabase-config.json';
const WEEKLY_REPORT_COLUMNS = [
  'id',
  'profile_id',
  'work_date',
  'year',
  'kw',
  'project_name',
  'commission_number',
  'total_work_minutes',
  'abz_typ'
].join(', ');
const state = {
  supabase: null,
  session: null,
  weekOffset: 0
};

const elements = {
  serviceStatus: document.getElementById('serviceStatus'),
  weekLabel: document.getElementById('weekLabel'),
  prevWeekBtn: document.getElementById('prevWeekBtn'),
  currentWeekBtn: document.getElementById('currentWeekBtn'),
  nextWeekBtn: document.getElementById('nextWeekBtn'),
  reportTableBody: document.getElementById('reportTableBody'),
  reportEmpty: document.getElementById('reportEmpty')
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

function buildMatrixRows(reports) {
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
        total: 0
      });
    }
    const row = grouped.get(key);
    const minutes = Number(entry.total_work_minutes || 0);
    row.days[dayIndex] += minutes;
    row.total += minutes;
  });
  return Array.from(grouped.values()).sort((a, b) =>
    a.projectName.localeCompare(b.projectName, 'de') || a.commissionNumber.localeCompare(b.commissionNumber, 'de')
  );
}

function renderMatrix(reports) {
  const days = getWeekDays();
  elements.weekLabel.textContent = formatWeekLabel(days);
  const rows = buildMatrixRows(reports);
  elements.reportEmpty.hidden = rows.length > 0;
  elements.reportTableBody.innerHTML = rows.map((row) => `
    <tr>
      <th scope="row">${escapeHtml(row.projectName)}</th>
      <td class="commission-cell">${escapeHtml(row.commissionNumber)}</td>
      ${row.days.map((minutes) => `<td class="hours-cell ${minutes ? 'has-hours' : ''}">${escapeHtml(formatHours(minutes))}</td>`).join('')}
      <td class="total-cell">${escapeHtml(formatHours(row.total))}</td>
    </tr>
  `).join('');
}

async function loadConfig() {
  const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('Supabase-Konfiguration konnte nicht geladen werden.');
  return response.json();
}

async function loadReports() {
  if (!state.supabase || !state.session?.user) return;
  setStatus('Rapporte werden geladen …');
  const days = getWeekDays();
  const { data, error } = await state.supabase
    .from('weekly_reports')
    .select(WEEKLY_REPORT_COLUMNS)
    .eq('profile_id', state.session.user.id)
    .gte('work_date', formatLocalDate(days[0]))
    .lte('work_date', formatLocalDate(days[6]))
    .eq('abz_typ', 0)
    .order('project_name', { ascending: true })
    .order('commission_number', { ascending: true })
    .order('work_date', { ascending: true });

  if (error) throw error;
  renderMatrix(data || []);
  setStatus('Normale Rapporte (Absenztyp 0)', 'success');
}

async function initServicePage() {
  refreshServiceIcons();
  try {
    const config = await loadConfig();
    state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await state.supabase.auth.getSession();
    if (error) throw error;
    state.session = data?.session || null;
    if (!state.session?.user) {
      setStatus('Bitte zuerst anmelden.', 'danger');
      renderMatrix([]);
      return;
    }
    await loadReports();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Rapporte konnten nicht geladen werden.', 'danger');
    renderMatrix([]);
  }
}

elements.prevWeekBtn?.addEventListener('click', async () => {
  state.weekOffset -= 1;
  await loadReports();
});

elements.currentWeekBtn?.addEventListener('click', async () => {
  state.weekOffset = 0;
  await loadReports();
});

elements.nextWeekBtn?.addEventListener('click', async () => {
  state.weekOffset += 1;
  await loadReports();
});

document.addEventListener('DOMContentLoaded', initServicePage);
