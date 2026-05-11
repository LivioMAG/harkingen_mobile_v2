const CONFIG_PATH = './supabase-config.json';
const SURCHARGE_RULES_PATH = './surcharge-rules.json';
const STORAGE_BUCKET = 'weekly-attachments';
const DEFAULT_START_TIME = '07:00';
const DEFAULT_END_TIME = '16:30';
const DEFAULT_WORK_HOURS = 8;
const DEFAULT_BREAK_MINUTES = 0;
const LONG_SHIFT_THRESHOLD_MINUTES = 7 * 60;
const LONG_SHIFT_LUNCH_MINUTES = 60;
const PDF_IMAGE_SCALE = 1.5;
const PDF_IMAGE_TYPE = 'image/jpeg';
const PDF_IMAGE_QUALITY = 0.88;
const REPORT_TYPE_LABELS = {
  ferien: 'Ferien',
  krankheit: 'Krankheit',
  militaer: 'Militär',
  unfall: 'Unfall',
  feiertag: 'Feiertag',
  uk: 'ÜK',
  berufsschule: 'Berufsschule'
};
const AUTO_REPORT_TYPES = new Set(['ferien', 'krankheit', 'militaer', 'unfall', 'feiertag', 'uk', 'berufsschule']);
const ABSENCE_TYPE_BY_REPORT_TYPE = {
  ferien: 1,
  krankheit: 2,
  militaer: 3,
  unfall: 4,
  feiertag: 5,
  uk: 6,
  berufsschule: 7
};
const REPORT_TYPE_BY_ABSENCE_TYPE = {
  1: 'ferien',
  2: 'krankheit',
  3: 'militaer',
  4: 'unfall',
  5: 'feiertag',
  6: 'uk',
  7: 'berufsschule'
};
const HOLIDAY_TYPE_LABELS = {
  ferien: 'Urlaub / Ferien',
  militaer: 'Militär',
  zivildienst: 'Zivildienst',
  unfall: 'Unfall',
  krankheit: 'Krankheit'
};
const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const NIGHT_SHIFT_NOTE_PREFIX = 'Nachtzeit';
const DAY_SHIFT_START_MINUTES = 6 * 60;
const DAY_SHIFT_END_MINUTES = 22 * 60;
const PROFILE_COLUMNS = 'id, email, first_name, last_name, full_name, role_label, tel, is_admin';
const ENTRY_MODE_SIMPLE = 'simple';
const ENTRY_MODE_DETAILED = 'detailed';
const PROJECT_NAME_PREVIEW_MAX_LENGTH = 30;
const WEEKLY_REPORT_COLUMNS = [
  'id',
  'profile_id',
  'work_date',
  'year',
  'kw',
  'project_name',
  'commission_number',
  'start_time',
  'end_time',
  'lunch_break_minutes',
  'additional_break_minutes',
  'total_work_minutes',
  'total_adjusted_work_minutes',
  'expenses_amount',
  'other_costs_amount',
  'expense_note',
  'notes',
  'attachments',
  'abz_typ',
  'created_at',
  'updated_at'
].join(', ');
const DEFAULT_SURCHARGE_RULES = {
  version: 1,
  timezone: 'Europe/Zurich',
  holidayCompensation: {
    enabled: true,
    reportType: 'feiertag',
    paidMultiplier: 2,
    unpaidMultiplier: 1,
    platformHolidayTable: 'Platform Holiday',
    columns: {
      date: 'date',
      label: 'label',
      isPaid: 'is_underlined_paid'
    }
  },
  rulesByWeekday: {
    monday: [
      { start: '00:00', end: '06:00', multiplier: 1.5 },
      { start: '06:00', end: '23:00', multiplier: 1.0 },
      { start: '23:00', end: '24:00', multiplier: 1.5 }
    ],
    tuesday: [
      { start: '00:00', end: '06:00', multiplier: 1.5 },
      { start: '06:00', end: '23:00', multiplier: 1.0 },
      { start: '23:00', end: '24:00', multiplier: 1.5 }
    ],
    wednesday: [
      { start: '00:00', end: '06:00', multiplier: 1.5 },
      { start: '06:00', end: '23:00', multiplier: 1.0 },
      { start: '23:00', end: '24:00', multiplier: 1.5 }
    ],
    thursday: [
      { start: '00:00', end: '06:00', multiplier: 1.5 },
      { start: '06:00', end: '23:00', multiplier: 1.0 },
      { start: '23:00', end: '24:00', multiplier: 1.5 }
    ],
    friday: [
      { start: '00:00', end: '06:00', multiplier: 1.5 },
      { start: '06:00', end: '23:00', multiplier: 1.0 },
      { start: '23:00', end: '24:00', multiplier: 1.5 }
    ],
    saturday: [
      { start: '00:00', end: '06:00', multiplier: 1.5 },
      { start: '06:00', end: '13:00', multiplier: 1.0 },
      { start: '13:00', end: '23:00', multiplier: 1.25 },
      { start: '23:00', end: '24:00', multiplier: 1.5 }
    ],
    sunday: [
      { start: '00:00', end: '24:00', multiplier: 2.0 }
    ]
  }
};
const RULE_WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const HOLIDAY_REQUEST_COLUMNS = [
  'id',
  'profile_id',
  'start_date',
  'end_date',
  'request_type',
  'approval_status',
  'notes',
  'attachments',
  'created_at',
  'updated_at'
].join(', ');
const HOLIDAY_APPROVAL_STATUS = {
  rejected: 0,
  pending: 1,
  approved: 2
};
const ROLE_OPTIONS = ['Lehrling', 'Elektrikinstallateur', 'Bauleiter', 'Projektleiter'];
const DEFAULT_ROLE_LABEL = ROLE_OPTIONS[0];

const state = {
  config: null,
  supabase: null,
  session: null,
  profile: null,
  weekOffset: 0,
  authMode: 'login',
  pendingOtpEmail: '',
  entries: [],
  holidays: [],
  selectedDate: null,
  editingEntry: null,
  editingHoliday: null,
  toastTimer: null,
  activeFeedback: null,
  currentView: 'timesheet',
  latestEntriesRequestId: 0,
  latestHolidayRequestId: 0,
  reportDraftAttachments: [],
  reportPendingFiles: [],
  holidayDraftAttachments: [],
  holidayPendingFiles: [],
  surchargeRules: DEFAULT_SURCHARGE_RULES,
  projectSuggestionsLoaded: false,
  projectSuggestions: [],
  dashboardReportDownloadLoading: false
  ,
  entryMode: ENTRY_MODE_SIMPLE
};

const elements = {
  authCard: document.getElementById('authCard'),
  authTitle: document.getElementById('authTitle'),
  authSubtitle: document.getElementById('authSubtitle'),
  authStatusPill: document.getElementById('authStatusPill'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authSwitchText: document.getElementById('authSwitchText'),
  authModeSwitchRow: document.getElementById('authModeSwitchRow'),
  toggleAuthModeBtn: document.getElementById('toggleAuthModeBtn'),
  fullNameField: document.getElementById('fullNameField'),
  signOutBtn: document.getElementById('signOutBtn'),
  appView: document.getElementById('appView'),
  navMenuToggleBtn: document.getElementById('navMenuToggleBtn'),
  navMenuDrawer: document.getElementById('navMenuDrawer'),
  navMenuBackdrop: document.getElementById('navMenuBackdrop'),
  navMenuItems: document.querySelectorAll('[data-nav-view]'),
  authForm: document.getElementById('authForm'),
  forgotPasswordForm: document.getElementById('forgotPasswordForm'),
  verifyOtpForm: document.getElementById('verifyOtpForm'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  fullNameInput: document.getElementById('fullNameInput'),
  forgotEmailInput: document.getElementById('forgotEmailInput'),
  otpCodeInput: document.getElementById('otpCodeInput'),
  forgotPasswordSubmitBtn: document.getElementById('forgotPasswordSubmitBtn'),
  verifyOtpSubmitBtn: document.getElementById('verifyOtpSubmitBtn'),
  openForgotPasswordBtn: document.getElementById('openForgotPasswordBtn'),
  cancelForgotPasswordBtn: document.getElementById('cancelForgotPasswordBtn'),
  forgotPasswordHint: document.getElementById('forgotPasswordHint'),
  forgotPasswordActions: document.getElementById('forgotPasswordActions'),
  dashboardWeekPanel: document.getElementById('dashboardWeekPanel'),
  weekRangeLabel: document.getElementById('weekRangeLabel'),
  weekGrid: document.getElementById('weekGrid'),
  dashboardView: document.getElementById('dashboardView'),
  dashboardReportYearInput: document.getElementById('dashboardReportYearInput'),
  dashboardReportWeekInput: document.getElementById('dashboardReportWeekInput'),
  dashboardReportDownloadBtn: document.getElementById('dashboardReportDownloadBtn'),
  weekEntryCount: document.getElementById('weekEntryCount'),
  weekMinutesTotal: document.getElementById('weekMinutesTotal'),
  weekExpensesTotal: document.getElementById('weekExpensesTotal'),
  summaryCard: document.getElementById('summaryCard'),
  prevWeekBtn: document.getElementById('prevWeekBtn'),
  nextWeekBtn: document.getElementById('nextWeekBtn'),
  currentWeekLabel: document.getElementById('currentWeekLabel'),
  openHolidayDrawerBtn: document.getElementById('openHolidayDrawerBtn'),
  holidayAbsencesView: document.getElementById('holidayAbsencesView'),
  settingsView: document.getElementById('settingsView'),
  requestsCard: document.getElementById('requestsCard'),
  holidayList: document.getElementById('holidayList'),
  holidayCountPill: document.getElementById('holidayCountPill'),
  settingsCard: document.getElementById('settingsCard'),
  adminStatusPill: document.getElementById('adminStatusPill'),
  settingsForm: document.getElementById('settingsForm'),
  firstNameInput: document.getElementById('firstNameInput'),
  lastNameInput: document.getElementById('lastNameInput'),
  phoneInput: document.getElementById('phoneInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  openPasswordViewBtn: document.getElementById('openPasswordViewBtn'),
  passwordView: document.getElementById('passwordView'),
  backToSettingsBtn: document.getElementById('backToSettingsBtn'),
  passwordResetForm: document.getElementById('passwordResetForm'),
  newPasswordInput: document.getElementById('newPasswordInput'),
  confirmPasswordInput: document.getElementById('confirmPasswordInput'),
  changePasswordBtn: document.getElementById('changePasswordBtn'),
  entryDrawer: document.getElementById('entryDrawer'),
  closeDrawerLinkBtn: document.getElementById('closeDrawerLinkBtn'),
  drawerTitle: document.getElementById('drawerTitle'),
  drawerDateLabel: document.getElementById('drawerDateLabel'),
  entryForm: document.getElementById('entryForm'),
  entryIdInput: document.getElementById('entryIdInput'),
  entryDateInput: document.getElementById('entryDateInput'),
  reportTypeInput: document.getElementById('reportTypeInput'),
  projectNameInput: document.getElementById('projectNameInput'),
  commissionInput: document.getElementById('commissionInput'),
  commissionSuggestionsList: document.getElementById('commissionSuggestionsList'),
  expensesToggleInput: document.getElementById('expensesToggleInput'),
  normalTimeFields: document.getElementById('normalTimeFields'),
  normalCostFields: document.getElementById('normalCostFields'),
  specialTimeFields: document.getElementById('specialTimeFields'),
  simpleTimeFields: document.getElementById('simpleTimeFields'),
  startTimeInput: document.getElementById('startTimeInput'),
  endTimeInput: document.getElementById('endTimeInput'),
  lunchMinutesInput: document.getElementById('lunchMinutesInput'),
  breakMinutesInput: document.getElementById('breakMinutesInput'),
  workHoursInput: document.getElementById('workHoursInput'),
  simpleDurationInput: document.getElementById('simpleDurationInput'),
  toggleEntryModeBtn: document.getElementById('toggleEntryModeBtn'),
  expensesInput: document.getElementById('expensesInput'),
  otherCostsInput: document.getElementById('otherCostsInput'),
  notesInput: document.getElementById('notesInput'),
  attachmentsCameraBtn: document.getElementById('attachmentsCameraBtn'),
  attachmentsGalleryBtn: document.getElementById('attachmentsGalleryBtn'),
  attachmentsCameraInput: document.getElementById('attachmentsCameraInput'),
  attachmentsGalleryInput: document.getElementById('attachmentsGalleryInput'),
  existingAttachmentsBlock: document.getElementById('existingAttachmentsBlock'),
  existingAttachmentsList: document.getElementById('existingAttachmentsList'),
  attachmentCountLabel: document.getElementById('attachmentCountLabel'),
  deleteEntryBtn: document.getElementById('deleteEntryBtn'),
  saveEntryBtn: document.getElementById('saveEntryBtn'),
  holidayDrawer: document.getElementById('holidayDrawer'),
  closeHolidayDrawerBtn: document.getElementById('closeHolidayDrawerBtn'),
  holidayForm: document.getElementById('holidayForm'),
  holidayIdInput: document.getElementById('holidayIdInput'),
  holidayStartDateInput: document.getElementById('holidayStartDateInput'),
  holidayEndDateInput: document.getElementById('holidayEndDateInput'),
  holidayTypeInput: document.getElementById('holidayTypeInput'),
  holidayNotesInput: document.getElementById('holidayNotesInput'),
  holidayAttachmentsCameraBtn: document.getElementById('holidayAttachmentsCameraBtn'),
  holidayAttachmentsGalleryBtn: document.getElementById('holidayAttachmentsGalleryBtn'),
  holidayAttachmentsCameraInput: document.getElementById('holidayAttachmentsCameraInput'),
  holidayAttachmentsGalleryInput: document.getElementById('holidayAttachmentsGalleryInput'),
  existingHolidayAttachmentsBlock: document.getElementById('existingHolidayAttachmentsBlock'),
  existingHolidayAttachmentsList: document.getElementById('existingHolidayAttachmentsList'),
  holidayAttachmentCountLabel: document.getElementById('holidayAttachmentCountLabel'),
  deleteHolidayBtn: document.getElementById('deleteHolidayBtn'),
  saveHolidayBtn: document.getElementById('saveHolidayBtn'),
  dayCardTemplate: document.getElementById('dayCardTemplate'),
  entryCardTemplate: document.getElementById('entryCardTemplate'),
  activityFeedback: document.getElementById('activityFeedback'),
  activityFeedbackLabel: document.getElementById('activityFeedbackLabel')
};

function showToast(message, type = 'success') {
  clearTimeout(state.toastTimer);
  document.querySelector('.toast')?.remove();

  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  document.body.appendChild(node);

  state.toastTimer = window.setTimeout(() => node.remove(), 3400);
}

function showActivity(message) {
  state.activeFeedback = message;
  elements.activityFeedbackLabel.textContent = message;
  elements.activityFeedback.classList.remove('hidden');
  elements.activityFeedback.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(() => elements.activityFeedback.classList.add('visible'));
}

function hideActivity() {
  state.activeFeedback = null;
  elements.activityFeedback.classList.remove('visible');
  elements.activityFeedback.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => {
    if (!state.activeFeedback) {
      elements.activityFeedback.classList.add('hidden');
      elements.activityFeedbackLabel.textContent = '';
    }
  }, 220);
}

function setButtonLoading(button, isLoading, loadingLabel) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  button.setAttribute('aria-busy', String(isLoading));
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
}

function setSectionBusy(section, isBusy) {
  if (!section) return;
  section.classList.toggle('is-busy', isBusy);
  section.setAttribute('aria-busy', String(isBusy));
}

async function runWithFeedback(options, task) {
  const { button, section, pendingMessage, loadingLabel } = options;
  showActivity(pendingMessage);
  setButtonLoading(button, true, loadingLabel);
  setSectionBusy(section, true);

  try {
    return await task();
  } finally {
    setButtonLoading(button, false, loadingLabel);
    setSectionBusy(section, false);
    hideActivity();
  }
}

function setPill(element, text, variant) {
  element.className = `pill ${variant}`;
  element.textContent = text;
}

function syncBodyScrollLock() {
  const hasOpenDrawer =
    !elements.entryDrawer.classList.contains('hidden') ||
    !elements.navMenuDrawer.classList.contains('hidden');
  document.body.classList.toggle('drawer-open', hasOpenDrawer);
}

function closeNavMenu() {
  elements.navMenuDrawer?.classList.add('hidden');
  elements.navMenuDrawer?.setAttribute('aria-hidden', 'true');
  elements.navMenuToggleBtn?.setAttribute('aria-expanded', 'false');
  syncBodyScrollLock();
}

function openNavMenu() {
  elements.navMenuDrawer?.classList.remove('hidden');
  elements.navMenuDrawer?.setAttribute('aria-hidden', 'false');
  elements.navMenuToggleBtn?.setAttribute('aria-expanded', 'true');
  syncBodyScrollLock();
}

function toggleNavMenu() {
  if (elements.navMenuDrawer?.classList.contains('hidden')) {
    openNavMenu();
  } else {
    closeNavMenu();
  }
}

function setCurrentView(view) {
  state.currentView = ['timesheet', 'holidayAbsences', 'dashboard', 'settings', 'password'].includes(view) ? view : 'timesheet';
  const inSettings = ['settings', 'password'].includes(state.currentView);
  const inTimesheet = state.currentView === 'timesheet';
  const inHolidayAbsences = state.currentView === 'holidayAbsences';
  const inDashboard = state.currentView === 'dashboard';
  const inPassword = state.currentView === 'password';

  elements.settingsView?.classList.toggle('hidden', !inSettings);
  elements.holidayAbsencesView?.classList.toggle('hidden', !inHolidayAbsences);
  elements.dashboardWeekPanel?.classList.toggle('hidden', !inTimesheet);
  elements.weekGrid?.classList.toggle('hidden', !inTimesheet);
  elements.summaryCard?.classList.toggle('hidden', !inTimesheet);
  elements.dashboardView?.classList.toggle('hidden', !inDashboard);
  elements.settingsCard?.classList.toggle('hidden', inPassword);
  elements.requestsCard?.classList.toggle('hidden', !inHolidayAbsences);
  elements.passwordView?.classList.toggle('hidden', !inPassword);
  elements.navMenuItems?.forEach((item) => {
    const itemView = item.dataset.navView;
    const isActive = itemView === 'settings' ? inSettings : itemView === state.currentView;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(Number(value || 0));
}

function formatPdfCurrency(value) {
  return new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDate(date) {
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDayMonth(date) {
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: 'long' }).format(date);
}

function getISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(baseDate = new Date(), offset = 0) {
  const date = new Date(baseDate);
  const currentDay = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - currentDay + offset * 7);
  return date;
}

function getWeekDays() {
  const monday = getWeekStart(new Date(), state.weekOffset);
  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, date, iso: getISODate(date) };
  });
}

function getWeekNumber(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
}

function getIsoWeekStartForYearAndWeek(year, week) {
  const jan4 = new Date(year, 0, 4);
  const jan4IsoDay = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(year, 0, 4 - jan4IsoDay);
  week1Monday.setHours(0, 0, 0, 0);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return monday;
}

function getIsoWeekYearAndNumber(date = new Date()) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNumber);
  const isoYear = copy.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
  return { isoYear, isoWeek };
}

function formatPdfHours(minutes) {
  const hours = Number(minutes || 0) / 60;
  return hours > 0 ? hours.toFixed(2) : '';
}

function buildWeeklyMatrixRows(reports) {
  const grouped = new Map();
  (reports || []).forEach((entry) => {
    const reportType = REPORT_TYPE_BY_ABSENCE_TYPE[Number(entry?.abz_typ) || 0] || '';
    if (reportType === 'berufsschule') {
      entry.project_name = REPORT_TYPE_LABELS.berufsschule;
    }
    if (AUTO_REPORT_TYPES.has(reportType) && reportType !== 'berufsschule') return;
    const dayIndex = Math.max(0, Math.min(5, ((parseLocalDate(entry.work_date).getDay() + 6) % 7)));
    const key = `${entry.project_name || '—'}|${entry.commission_number || ''}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectName: entry.project_name || '—',
        commissionNumber: entry.commission_number || '',
        days: Array(6).fill(0),
        total: 0,
        expenses: 0,
        notes: []
      });
    }
    const row = grouped.get(key);
    const minutes = Number(entry.total_work_minutes || 0);
    row.days[dayIndex] += minutes;
    row.total += minutes;
    row.expenses += Number(entry.expenses_amount || 0) + Number(entry.other_costs_amount || 0);
    if (entry.notes) row.notes.push(String(entry.notes).trim());
    if (entry.expense_note) row.notes.push(String(entry.expense_note).trim());
  });
  return Array.from(grouped.values());
}

function buildAbsenceMatrixRows(reports) {
  const types = ['ferien', 'krankheit', 'militaer', 'unfall', 'feiertag', 'uk'];
  const mapped = types.map((type) => {
    const days = Array(7).fill(0);
    (reports || []).forEach((entry) => {
      const reportType = REPORT_TYPE_BY_ABSENCE_TYPE[Number(entry?.abz_typ) || 0] || '';
      if (reportType !== type) return;
      const dayIndex = Math.max(0, Math.min(6, ((parseLocalDate(entry.work_date).getDay() + 6) % 7)));
      days[dayIndex] += Number(entry.total_work_minutes || 0);
    });
    return { label: REPORT_TYPE_LABELS[type], days, total: days.reduce((sum, n) => sum + n, 0) };
  });
  const totalDays = Array(7).fill(0);
  mapped.forEach((row) => row.days.forEach((minutes, idx) => { totalDays[idx] += minutes; }));
  mapped.push({
    label: 'Absenzen Total',
    days: totalDays,
    total: totalDays.reduce((sum, n) => sum + n, 0),
    isTotal: true
  });
  return mapped;
}

function drawReportHeader() {}
function drawWeeklyTotalRow() {}
function drawAbsenceTable() {}
function drawRemarksBox() {}

function drawWeeklyReportPage(doc, payload) {
  const { profileName, week, year, weekStart, weekEnd, reports } = payload;
  const rows = buildWeeklyMatrixRows(reports);
  const absenceRows = buildAbsenceMatrixRows(reports);
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 10;
  const rightMargin = 10;
  const tableWidth = pageWidth - leftMargin - rightMargin;
  const scaleX = (value) => leftMargin + (((value - 10) / 190) * tableWidth);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Wochenrapport', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.rect(leftMargin, 22, tableWidth, 10);
  doc.text(profileName || '—', leftMargin + 2, 28);
  doc.text(`${weekStart.getDate()}.${weekStart.getMonth() + 1}.${weekStart.getFullYear()} - ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}.${weekEnd.getFullYear()}`, pageWidth / 2, 28, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`KW ${week}`, pageWidth - rightMargin - 1, 28, { align: 'right' });
  const startY = 38;
  const dayLabels = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
  const colX = {
    project: scaleX(10),
    commission: scaleX(42),
    mo: scaleX(58),
    di: scaleX(66),
    mi: scaleX(74),
    do: scaleX(82),
    fr: scaleX(90),
    sa: scaleX(98),
    so: scaleX(106),
    total: scaleX(114),
    expenses: scaleX(124),
    notes: scaleX(134),
    end: scaleX(200)
  };
  const dayCenters = [
    (colX.mo + colX.di) / 2,
    (colX.di + colX.mi) / 2,
    (colX.mi + colX.do) / 2,
    (colX.do + colX.fr) / 2,
    (colX.fr + colX.sa) / 2,
    (colX.sa + colX.so) / 2,
    (colX.so + colX.total) / 2
  ];
  const tableColumns = [colX.project, colX.commission, colX.mo, colX.di, colX.mi, colX.do, colX.fr, colX.sa, colX.so, colX.total, colX.expenses, colX.notes, colX.end];
  const drawTableGridRow = (rowY, rowHeight = 6) => {
    doc.rect(colX.project, rowY, colX.end - colX.project, rowHeight);
    tableColumns.slice(1, -1).forEach((x) => doc.line(x, rowY, x, rowY + rowHeight));
  };
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  drawTableGridRow(startY, 6);
  doc.text('Projektname', colX.project + 1, startY + 4);
  doc.text('Kom. Nr.', colX.commission + 1, startY + 4);
  dayLabels.forEach((label, idx) => doc.text(label, dayCenters[idx], startY + 4, { align: 'center' }));
  doc.text('Total', colX.expenses - 1, startY + 4, { align: 'right' });
  doc.text('Spesen', colX.notes - 1, startY + 4, { align: 'right' });
  doc.text('Bemerkungen', colX.notes + 1, startY + 4);
  let y = startY + 6;
  doc.setFont('helvetica', 'normal');
  const maxMatrixRows = 10;
  for (let rowIndex = 0; rowIndex < maxMatrixRows; rowIndex += 1) {
    const row = rows[rowIndex];
    drawTableGridRow(y, 6);
    if (row) {
      doc.text(String(row.projectName || '').slice(0, 30), colX.project + 1, y + 4);
      doc.text(String(row.commissionNumber || '').slice(0, 15), colX.commission + 1, y + 4);
      row.days.forEach((minutes, idx) => doc.text(formatPdfHours(minutes), dayCenters[idx], y + 4, { align: 'center' }));
      doc.text(formatPdfHours(row.total), colX.expenses - 1, y + 4, { align: 'right' });
      doc.text(formatPdfCurrency(row.expenses), colX.notes - 1, y + 4, { align: 'right' });
      doc.text((row.notes[0] || '').slice(0, 24), colX.notes + 1, y + 4);
    }
    y += 6;
  }
  const dayTotals = Array(7).fill(0);
  const weekTotalMinutes = rows.reduce((sum, row) => sum + row.total, 0);
  const weekTotalExpenses = rows.reduce((sum, row) => sum + row.expenses, 0);
  rows.forEach((row) => row.days.forEach((m, idx) => { dayTotals[idx] += m; }));
  doc.setFont('helvetica', 'bold');
  drawTableGridRow(y, 8);
  doc.text('Wochentotal', 11, y + 5);
  dayTotals.forEach((minutes, idx) => doc.text(formatPdfHours(minutes), dayCenters[idx], y + 5, { align: 'center' }));
  doc.text(formatPdfHours(weekTotalMinutes), colX.expenses - 1, y + 5, { align: 'right' });
  doc.text(formatPdfCurrency(weekTotalExpenses), colX.notes - 1, y + 5, { align: 'right' });
  y += 12;
  const drawAbsenceGridRow = (rowY, rowHeight = 6) => {
    doc.rect(colX.project, rowY, colX.end - colX.project, rowHeight);
    [colX.mo, colX.di, colX.mi, colX.do, colX.fr, colX.sa, colX.so, colX.total, colX.expenses].forEach((x) => doc.line(x, rowY, x, rowY + rowHeight));
  };
  absenceRows.forEach((row) => {
    doc.setFont('helvetica', row.isTotal ? 'bold' : 'normal');
    drawAbsenceGridRow(y, 6);
    doc.text(row.label, 11, y + 4);
    row.days.forEach((minutes, idx) => doc.text(formatPdfHours(minutes), dayCenters[idx], y + 4, { align: 'center' }));
    doc.text(formatPdfHours(row.total), colX.expenses - 1, y + 4, { align: 'right' });
    y += 6;
  });
}

async function exportWeekPdf({ year, week, profileId, currentUserOnly = false } = {}) {
  if (!state.supabase || !state.session?.user) throw new Error('Nicht angemeldet.');
  const selectedProfileId = currentUserOnly ? state.session.user.id : profileId;
  if (!selectedProfileId) throw new Error('Profil nicht gefunden.');
  const weekStart = getIsoWeekStartForYearAndWeek(year, week);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startIso = getISODate(weekStart);
  const endIso = getISODate(weekEnd);
  const { data: reports, error } = await state.supabase
    .from('weekly_reports')
    .select(WEEKLY_REPORT_COLUMNS)
    .eq('profile_id', selectedProfileId)
    .gte('work_date', startIso)
    .lte('work_date', endIso)
    .order('work_date', { ascending: true });
  if (error) throw error;
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  drawWeeklyReportPage(doc, {
    profileName: getDisplayName(state.profile, state.session?.user?.email || ''),
    week,
    year,
    weekStart,
    weekEnd,
    reports: reports || []
  });
  const safeName = String(getDisplayName(state.profile, state.session?.user?.email || '') || 'user').replace(/[^\w.-]+/g, '_');
  doc.save(`wochenrapport_KW-${week}_${year}_${safeName}.pdf`);
}

function toMinutes(timeValue) {
  if (!timeValue || !timeValue.includes(':')) return null;
  const [hour, minute] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function clampMultiplier(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return numeric;
}

function normalizeSurchargeRules(inputRules) {
  const source = inputRules && typeof inputRules === 'object' ? inputRules : DEFAULT_SURCHARGE_RULES;
  const normalized = { ...DEFAULT_SURCHARGE_RULES, ...source };
  const holidaySource = source?.holidayCompensation && typeof source.holidayCompensation === 'object'
    ? source.holidayCompensation
    : {};
  const holidayDefaults = DEFAULT_SURCHARGE_RULES.holidayCompensation;
  normalized.holidayCompensation = {
    ...holidayDefaults,
    ...holidaySource,
    columns: {
      ...holidayDefaults.columns,
      ...(holidaySource.columns && typeof holidaySource.columns === 'object' ? holidaySource.columns : {})
    },
    paidMultiplier: clampMultiplier(holidaySource.paidMultiplier ?? holidayDefaults.paidMultiplier),
    unpaidMultiplier: clampMultiplier(holidaySource.unpaidMultiplier ?? holidayDefaults.unpaidMultiplier)
  };
  const rulesByWeekday = {};

  RULE_WEEKDAY_KEYS.forEach((weekday) => {
    const sourceWindows = Array.isArray(source?.rulesByWeekday?.[weekday])
      ? source.rulesByWeekday[weekday]
      : DEFAULT_SURCHARGE_RULES.rulesByWeekday[weekday];

    rulesByWeekday[weekday] = sourceWindows
      .map((window) => ({
        start: window.start,
        end: window.end,
        multiplier: clampMultiplier(window.multiplier)
      }))
      .filter((window) => toMinutes(window.start) !== null && toMinutes(window.end) !== null && toMinutes(window.end) > toMinutes(window.start))
      .sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
  });

  normalized.rulesByWeekday = rulesByWeekday;
  return normalized;
}

function parseBooleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'ja'].includes(normalized);
  }
  return false;
}

function getHolidayConfig() {
  return state.surchargeRules?.holidayCompensation || DEFAULT_SURCHARGE_RULES.holidayCompensation;
}

async function resolveHolidayCompensation(workDate) {
  const config = getHolidayConfig();
  if (!state.supabase || !workDate || config.enabled === false) {
    return { multiplier: 1, isPaid: false, found: false, label: '' };
  }

  const tableName = config.platformHolidayTable || DEFAULT_SURCHARGE_RULES.holidayCompensation.platformHolidayTable;
  const dateColumn = config.columns?.date || DEFAULT_SURCHARGE_RULES.holidayCompensation.columns.date;
  const labelColumn = config.columns?.label || DEFAULT_SURCHARGE_RULES.holidayCompensation.columns.label;
  const isPaidColumn = config.columns?.isPaid || DEFAULT_SURCHARGE_RULES.holidayCompensation.columns.isPaid;

  try {
    const { data, error } = await state.supabase
      .from(tableName)
      .select('*')
      .eq(dateColumn, workDate)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        multiplier: clampMultiplier(config.unpaidMultiplier),
        isPaid: false,
        found: false,
        label: ''
      };
    }

    const isPaid = parseBooleanValue(data?.[isPaidColumn]);
    return {
      multiplier: isPaid ? clampMultiplier(config.paidMultiplier) : clampMultiplier(config.unpaidMultiplier),
      isPaid,
      found: true,
      label: data?.[labelColumn] || ''
    };
  } catch (error) {
    console.warn('Feiertagsdaten konnten nicht geladen werden.', error);
    return { multiplier: 1, isPaid: false, found: false, label: '' };
  }
}

function getSurchargeMultiplier(weekdayIndex, minuteOfDay, rules) {
  const weekdayKey = RULE_WEEKDAY_KEYS[weekdayIndex];
  const dayRules = rules?.rulesByWeekday?.[weekdayKey] || [];
  const activeRule = dayRules.find((window) => minuteOfDay >= toMinutes(window.start) && minuteOfDay < toMinutes(window.end));
  return activeRule ? clampMultiplier(activeRule.multiplier) : 1;
}

function calculateAdjustedWorkMinutes(workDate, startTime, endTime, totalWorkMinutes, surchargeRules) {
  const baseMinutes = Math.max(0, Number(totalWorkMinutes || 0));
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  if (!workDate || startMinutes === null || endMinutes === null || baseMinutes <= 0) {
    return baseMinutes;
  }

  const rules = normalizeSurchargeRules(surchargeRules);
  const shiftDuration = getShiftDurationMinutes(startTime, endTime);
  if (!shiftDuration) return baseMinutes;

  const shiftStart = parseLocalDate(workDate);
  shiftStart.setHours(0, 0, 0, 0);
  shiftStart.setMinutes(startMinutes);

  const shiftEnd = new Date(shiftStart);
  shiftEnd.setMinutes(shiftEnd.getMinutes() + shiftDuration);

  let cursor = new Date(shiftStart);
  let surchargeExtraMinutes = 0;
  while (cursor < shiftEnd) {
    const minuteOfDay = cursor.getHours() * 60 + cursor.getMinutes();
    const weekdayIndex = cursor.getDay();
    const multiplier = getSurchargeMultiplier(weekdayIndex, minuteOfDay, rules);
    const weekdayKey = RULE_WEEKDAY_KEYS[weekdayIndex];
    const dayRules = rules?.rulesByWeekday?.[weekdayKey] || [];
    const activeWindow = dayRules.find((window) => minuteOfDay >= toMinutes(window.start) && minuteOfDay < toMinutes(window.end));
    const currentRuleEndMinutes = activeWindow ? toMinutes(activeWindow.end) : (minuteOfDay + 1);

    const cursorDayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const ruleEnd = new Date(cursorDayStart);
    ruleEnd.setMinutes(Math.min(currentRuleEndMinutes, 24 * 60));
    const segmentEnd = ruleEnd < shiftEnd ? ruleEnd : shiftEnd;
    const segmentDuration = Math.max(0, Math.round((segmentEnd - cursor) / 60000));
    if (segmentDuration <= 0) {
      cursor.setMinutes(cursor.getMinutes() + 1);
      continue;
    }
    surchargeExtraMinutes += segmentDuration * Math.max(0, multiplier - 1);
    cursor = segmentEnd;
  }

  return Math.round(baseMinutes + surchargeExtraMinutes);
}

function minutesBetween(startTime, endTime, lunchMinutes, breakMinutes) {
  const raw = getShiftDurationMinutes(startTime, endTime);
  return Math.max(0, raw - Number(lunchMinutes || 0) - Number(breakMinutes || 0));
}

function getShiftDurationMinutes(startTime, endTime) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return 0;
  return end < start ? (24 * 60 - start) + end : end - start;
}

function getAutomaticLunchMinutes(startTime, endTime) {
  const durationMinutes = getShiftDurationMinutes(startTime, endTime);
  return durationMinutes >= LONG_SHIFT_THRESHOLD_MINUTES ? LONG_SHIFT_LUNCH_MINUTES : 0;
}

function setSelectOrInputValue(element, value) {
  const normalized = String(value ?? '0');
  if (!element) return;
  const optionExists = Array.from(element.options || []).some((option) => option.value === normalized);
  if (optionExists || !element.options) {
    element.value = normalized;
    return;
  }

  const fallbackOption = document.createElement('option');
  fallbackOption.value = normalized;
  fallbackOption.textContent = normalized;
  element.appendChild(fallbackOption);
  element.value = normalized;
}

function syncNormalBreakRules() {
  const durationMinutes = getShiftDurationMinutes(elements.startTimeInput.value, elements.endTimeInput.value);
  if (durationMinutes < LONG_SHIFT_THRESHOLD_MINUTES) {
    setSelectOrInputValue(elements.lunchMinutesInput, 0);
    setSelectOrInputValue(elements.breakMinutesInput, 0);
    return;
  }

  setSelectOrInputValue(elements.lunchMinutesInput, getAutomaticLunchMinutes(elements.startTimeInput.value, elements.endTimeInput.value));
  if (!elements.breakMinutesInput.value || Number(elements.breakMinutesInput.value) < 0) {
    setSelectOrInputValue(elements.breakMinutesInput, DEFAULT_BREAK_MINUTES);
  }
}

function entryHasAttachments() {
  return state.reportDraftAttachments.length + state.reportPendingFiles.length > 0;
}

function requiresExpenseAttachment(payload) {
  return Number(payload.other_costs_amount || 0) > 0;
}

function commissionRequiresGeneralNote(commissionNumber = '') {
  return commissionNumber.toUpperCase().includes('K');
}

function shiftOverlapsNightWindow(startTime, endTime) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return false;

  const shiftWindows = end <= start
    ? [
      { start, end: 24 * 60 },
      { start: 0, end }
    ]
    : [{ start, end }];

  const nightWindows = [
    { start: DAY_SHIFT_END_MINUTES, end: 24 * 60 },
    { start: 0, end: DAY_SHIFT_START_MINUTES }
  ];

  return shiftWindows.some((shiftWindow) =>
    nightWindows.some((nightWindow) =>
      shiftWindow.start < nightWindow.end && shiftWindow.end > nightWindow.start
    )
  );
}

function getWeekdayLabel(isoDate) {
  if (!isoDate) return '';
  const date = parseLocalDate(isoDate);
  return WEEKDAY_LABELS[(date.getDay() + 6) % 7] || '';
}

function formatTimeWithoutSeconds(timeValue) {
  const value = String(timeValue || '').trim();
  if (!value) return '';
  return value.slice(0, 5);
}

function buildShiftBoundaryNote(workDate, startTime, endTime) {
  if (!shiftOverlapsNightWindow(startTime, endTime)) {
    return '';
  }

  const weekday = getWeekdayLabel(workDate);
  return `${NIGHT_SHIFT_NOTE_PREFIX} ${weekday}: ${formatTimeWithoutSeconds(startTime)} - ${formatTimeWithoutSeconds(endTime)}`;
}

function mergeShiftBoundaryNote(notes, autoNote) {
  const lines = String(notes || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(`${NIGHT_SHIFT_NOTE_PREFIX} `) && !line.startsWith(`Arbeitszeit, Nachtzeit (`));

  if (autoNote) {
    lines.push(autoNote);
  }

  return lines.join('\n');
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatMinutesLong(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} Stunden ${String(minutes).padStart(2, '0')} Minuten`;
}

function truncateTextWithEllipsis(value, maxLength = PROJECT_NAME_PREVIEW_MAX_LENGTH) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  if (normalizedValue.length <= maxLength) return normalizedValue;
  return `${normalizedValue.slice(0, maxLength)}...`;
}

function getHourMinuteParts(totalMinutes) {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60
  };
}

function getOriginalWorkMinutes(entry) {
  return Number(entry?.total_work_minutes || 0);
}

function getAdjustedWorkMinutes(entry) {
  return Number(entry?.total_adjusted_work_minutes || 0);
}

function hasHigherAdjustedWorkMinutes(entry) {
  const originalMinutes = getOriginalWorkMinutes(entry);
  const adjustedMinutes = getAdjustedWorkMinutes(entry);
  return adjustedMinutes > 0 && adjustedMinutes > originalMinutes;
}

function getEffectiveWorkMinutes(entry) {
  return hasHigherAdjustedWorkMinutes(entry) ? getAdjustedWorkMinutes(entry) : getOriginalWorkMinutes(entry);
}

function formatAdjustedEntryMinutes(entry) {
  const originalMinutes = getOriginalWorkMinutes(entry);
  if (!hasHigherAdjustedWorkMinutes(entry)) {
    const { hours, minutes } = getHourMinuteParts(originalMinutes);
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  const adjustedMinutes = getAdjustedWorkMinutes(entry);
  const original = getHourMinuteParts(originalMinutes);
  const adjusted = getHourMinuteParts(adjustedMinutes);
  return `${original.hours}<span class="entry-minutes-adjusted">(${adjusted.hours})</span>h ${String(original.minutes).padStart(2, '0')}<span class="entry-minutes-adjusted">(${String(adjusted.minutes).padStart(2, '0')})</span>min`;
}

function getReportTypeFromCommission(commissionNumber = '') {
  const normalizedCommission = String(commissionNumber || '').trim().toLowerCase();
  return (
    Object.entries(REPORT_TYPE_LABELS).find(([, label]) => label.toLowerCase() === normalizedCommission)?.[0] ||
    ''
  );
}

function getReportTypeFromText(value = '') {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (!normalizedValue) return '';

  return (
    Object.entries(REPORT_TYPE_LABELS).find(([, label]) => {
      const normalizedLabel = label.toLowerCase();
      return (
        normalizedValue === normalizedLabel ||
        normalizedValue.includes(normalizedLabel)
      );
    })?.[0] || ''
  );
}

function syncReportTypeFromProjectOrCommission() {
  const reportType =
    getReportTypeFromText(elements.projectNameInput.value) ||
    getReportTypeFromText(elements.commissionInput.value);

  if (!reportType || elements.reportTypeInput.value === reportType) return;

  elements.reportTypeInput.value = reportType;
  applyReportTypeSelection(reportType, { setDefaultAutoHours: true });
}

function pickFirstFilledValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeProjectSuggestion(record) {
  if (!record || typeof record !== 'object') return null;

  const commissionNumber = pickFirstFilledValue(record, [
    'commission_number',
    'commission',
    'kommissionsnummer',
    'project_number',
    'number',
    'nummer'
  ]);
  const projectName = pickFirstFilledValue(record, [
    'project_name',
    'name',
    'title',
    'projektname',
    'project_title'
  ]);

  if (!commissionNumber) return null;
  return { commissionNumber, projectName, allowExpenses: Boolean(record?.allow_expenses) };
}

function findCommissionSuggestionMatch() {
  const value = elements.commissionInput.value.trim().toLowerCase();
  if (!value) return null;

  return (
    state.projectSuggestions.find((item) => item.commissionNumber.toLowerCase() === value) || null
  );
}

function renderCommissionSuggestions(searchValue = '') {
  const normalizedSearch = String(searchValue || '').trim().toLowerCase();
  const suggestions = state.projectSuggestions
    .filter((item) => {
      if (!normalizedSearch) return true;
      const commissionMatches = item.commissionNumber.toLowerCase().includes(normalizedSearch);
      const projectNameMatches = (item.projectName || '').toLowerCase().includes(normalizedSearch);
      return commissionMatches || projectNameMatches;
    })
    .slice(0, 5);

  renderCommissionSuggestionsList(suggestions);
  return suggestions;
}

function renderCommissionSuggestionsList(suggestions = []) {
  if (!elements.commissionSuggestionsList) return;
  elements.commissionSuggestionsList.innerHTML = '';

  if (!suggestions.length || AUTO_REPORT_TYPES.has(elements.reportTypeInput.value)) {
    elements.commissionSuggestionsList.classList.add('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  suggestions.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-item';
    button.dataset.commission = item.commissionNumber;
    button.dataset.projectName = item.projectName || '';
    button.setAttribute('role', 'option');
    button.innerHTML = `
      <strong>${escapeHtml(item.commissionNumber)}</strong>
      <span>${escapeHtml(item.projectName || 'Ohne Projektname')}</span>
    `;
    fragment.appendChild(button);
  });

  elements.commissionSuggestionsList.appendChild(fragment);
  elements.commissionSuggestionsList.classList.remove('hidden');
}

function hideCommissionSuggestionsList() {
  if (!elements.commissionSuggestionsList) return;
  elements.commissionSuggestionsList.classList.add('hidden');
}

function applyCommissionSuggestion(commissionNumber) {
  if (!commissionNumber) return;
  elements.commissionInput.value = commissionNumber;
  syncProjectNameFromCommission();
  syncExpenseToggleState();
  hideCommissionSuggestionsList();
  closeKeyboardAndSuggestions(elements.commissionInput);
}

function syncProjectNameFromCommission() {
  if (AUTO_REPORT_TYPES.has(elements.reportTypeInput.value)) return;
  const match = findCommissionSuggestionMatch();
  if (!match?.projectName) return;

  elements.projectNameInput.value = match.projectName;
}

function syncExpenseToggleState() {
  const isAutoType = AUTO_REPORT_TYPES.has(elements.reportTypeInput.value);
  const isUkType = elements.reportTypeInput.value === 'uk';
  const projectMatch = findCommissionSuggestionMatch();
  const canToggleExpenses = !isAutoType && (!projectMatch || projectMatch.allowExpenses);

  if (isUkType) {
    elements.expensesToggleInput.checked = true;
    elements.expensesToggleInput.disabled = true;
    elements.expensesInput.value = '18';
    return;
  }

  elements.expensesToggleInput.disabled = !canToggleExpenses;
  if (!canToggleExpenses) {
    elements.expensesToggleInput.checked = false;
  }
  elements.expensesInput.value = elements.expensesToggleInput.checked ? '18' : '0';
}

function closeKeyboardAndSuggestions(inputElement) {
  if (!inputElement) return;
  inputElement.blur();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

async function loadProjectSuggestions() {
  if (!state.supabase || !state.session?.user || state.projectSuggestionsLoaded) return;

  const { data, error } = await state.supabase
    .from('projects')
    .select('*')
    .limit(2000);

  state.projectSuggestionsLoaded = true;
  if (error) {
    console.warn('Projects-Autocomplete konnte nicht geladen werden:', error.message);
    state.projectSuggestions = [];
    return;
  }

  const suggestions = (data || [])
    .map(normalizeProjectSuggestion)
    .filter(Boolean);
  const uniqueByCommission = new Map();
  suggestions.forEach((item) => {
    if (!uniqueByCommission.has(item.commissionNumber.toLowerCase())) {
      uniqueByCommission.set(item.commissionNumber.toLowerCase(), item);
    }
  });
  state.projectSuggestions = Array.from(uniqueByCommission.values());
}

async function handleCommissionInput() {
  syncReportTypeFromProjectOrCommission();
  await loadProjectSuggestions();
  const suggestions = renderCommissionSuggestions(elements.commissionInput.value);
  syncProjectNameFromCommission();
  syncExpenseToggleState();
  return suggestions;
}

function applyReportTypeSelection(reportType, options = {}) {
  const { setDefaultAutoHours = true } = options;
  const reportLabel = REPORT_TYPE_LABELS[reportType] || '';
  const isAutoType = AUTO_REPORT_TYPES.has(reportType);
  const commissionField = elements.commissionInput.closest('.field');
  const projectNameField = elements.projectNameInput.closest('.field');

  if (reportLabel) {
    elements.projectNameInput.value = reportLabel;
    elements.commissionInput.value = reportLabel;
  } else if (AUTO_REPORT_TYPES.has(elements.reportTypeInput.dataset.previousValue || '')) {
    elements.projectNameInput.value = '';
    elements.commissionInput.value = '';
  }

  if (reportType === 'uk') {
    elements.expensesInput.value = 18;
  }
  const isDetailedEntryMode = state.entryMode === ENTRY_MODE_DETAILED;
  elements.normalTimeFields.classList.toggle('hidden', isAutoType || !isDetailedEntryMode);
  elements.simpleTimeFields.classList.toggle('hidden', isAutoType || isDetailedEntryMode);
  elements.normalCostFields?.classList.toggle('hidden', isAutoType);
  elements.specialTimeFields.classList.toggle('hidden', !isAutoType);
  elements.startTimeInput.required = !isAutoType && isDetailedEntryMode;
  elements.endTimeInput.required = !isAutoType && isDetailedEntryMode;
  elements.simpleDurationInput.required = !isAutoType && !isDetailedEntryMode;
  elements.workHoursInput.required = isAutoType;
  elements.projectNameInput.required = !isAutoType;
  elements.projectNameInput.readOnly = isAutoType;
  elements.commissionInput.readOnly = isAutoType;
  elements.expensesInput.readOnly = true;
  commissionField?.classList.toggle('hidden', isAutoType);
  projectNameField?.classList.toggle('hidden', isAutoType);
  elements.reportTypeInput.dataset.previousValue = reportType;
  syncAutoReportHourConstraints({ setDefaultForAutoType: isAutoType && setDefaultAutoHours });
  syncExpenseToggleState();
}

function validateConfig(config) {
  return Boolean(
    config &&
      typeof config.supabaseUrl === 'string' &&
      typeof config.supabaseAnonKey === 'string' &&
      config.supabaseUrl.startsWith('https://') &&
      config.supabaseAnonKey.length > 20 &&
      !config.supabaseUrl.includes('YOUR_') &&
      !config.supabaseAnonKey.includes('YOUR_')
  );
}

function setAuthMode(mode) {
  state.authMode = ['register', 'forgot', 'otp'].includes(mode) ? mode : 'login';
  const isRegister = state.authMode === 'register';
  const isForgot = state.authMode === 'forgot';
  const isOtp = state.authMode === 'otp';
  const isLoginLike = !isForgot && !isOtp;

  elements.authForm.classList.toggle('hidden', !isLoginLike);
  elements.forgotPasswordForm.classList.toggle('hidden', !isForgot);
  elements.verifyOtpForm.classList.toggle('hidden', !isOtp);
  elements.forgotPasswordHint.classList.toggle('hidden', !isOtp);
  elements.authModeSwitchRow.classList.toggle('hidden', isForgot || isOtp);
  elements.forgotPasswordActions.classList.toggle('hidden', isRegister);
  elements.openForgotPasswordBtn.classList.toggle('hidden', !isLoginLike);
  elements.cancelForgotPasswordBtn.classList.toggle('hidden', isLoginLike);

  if (isForgot) {
    elements.authTitle.textContent = 'Passwort vergessen';
    elements.authSubtitle.textContent = 'Wir senden dir einen 6-stelligen Code per E-Mail.';
    elements.forgotEmailInput.value = elements.emailInput.value.trim() || elements.forgotEmailInput.value;
    return;
  }

  if (isOtp) {
    elements.authTitle.textContent = 'Code eingeben';
    elements.authSubtitle.textContent = `Gib den Code ein, den wir an ${state.pendingOtpEmail} gesendet haben.`;
    return;
  }

  elements.authTitle.textContent = isRegister ? 'Registrieren' : 'Anmelden';
  elements.authSubtitle.textContent = isRegister
    ? 'Erstelle dein Konto mit E-Mail und Passwort.'
    : 'Melde dich mit E-Mail und Passwort an.';
  elements.authSubmitBtn.textContent = isRegister ? 'Registrieren' : 'Anmelden';
  elements.authSwitchText.textContent = isRegister ? 'Bereits registriert?' : 'Noch kein Konto?';
  elements.toggleAuthModeBtn.textContent = isRegister ? 'Zum Login' : 'Jetzt registrieren';
  elements.fullNameField.classList.toggle('hidden', !isRegister);
  elements.passwordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
}

async function loadConfig() {
  try {
    const [configResponse, surchargeRulesResponse] = await Promise.all([
      fetch(CONFIG_PATH, { cache: 'no-store' }),
      fetch(SURCHARGE_RULES_PATH, { cache: 'no-store' }).catch(() => null)
    ]);
    if (!configResponse.ok) throw new Error('Konfigurationsdatei nicht gefunden.');

    const config = await configResponse.json();
    state.config = config;
    if (surchargeRulesResponse?.ok) {
      state.surchargeRules = normalizeSurchargeRules(await surchargeRulesResponse.json());
    } else {
      state.surchargeRules = normalizeSurchargeRules(DEFAULT_SURCHARGE_RULES);
    }

    if (!validateConfig(config)) {
      throw new Error('Konfiguration unvollständig.');
    }

    state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    wireAuthListener();
    await bootstrapSession();
  } catch (error) {
    console.error(error);
    setPill(elements.authStatusPill, 'Verbindung fehlt', 'danger');
    showToast('Supabase-Konfiguration konnte nicht geladen werden.', 'error');
  }
}

async function syncSessionState(session) {
  state.session = session;

  if (!session?.user) {
    state.profile = null;
    state.entries = [];
    state.holidays = [];
    render();
    return;
  }

  render();

  try {
    await ensureProfile(session.user);
    await loadOptionalProfileWeeklyHours(session.user.id);
    await Promise.all([loadEntries(), loadHolidayRequests()]);
  } catch (error) {
    console.error(error);
    showToast(`Sitzung konnte nicht vollständig geladen werden: ${error.message}`, 'error');
  }

  render();
}

function wireAuthListener() {
  state.supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase empfiehlt, Folgeaufrufe asynchron aus dem Auth-Callback auszulagern,
    // damit keine Deadlocks bei weiteren Auth-/DB-Requests entstehen.
    window.setTimeout(() => {
      syncSessionState(session).catch((error) => {
        console.error(error);
        showToast(`Sitzung konnte nicht aktualisiert werden: ${error.message}`, 'error');
      });
    }, 0);
  });
}

async function bootstrapSession() {
  const { data, error } = await state.supabase.auth.getSession();
  if (error) {
    showToast(error.message, 'error');
    return;
  }

  await syncSessionState(data.session);
}

function splitFullName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function getDisplayName(profile, fallbackEmail = '') {
  const first = profile?.first_name?.trim() || '';
  const last = profile?.last_name?.trim() || '';
  const full = [first, last].filter(Boolean).join(' ').trim();
  return full || profile?.full_name || fallbackEmail;
}

function getAutoReportMaxHours() {
  const weeklyHours = Number(state.profile?.weekly_hours || 0);
  const profileDailyHours = Number.isFinite(weeklyHours) && weeklyHours > 0 ? weeklyHours / 5 : 0;
  return Math.max(DEFAULT_WORK_HOURS, profileDailyHours);
}

function syncAutoReportHourConstraints({ setDefaultForAutoType = false } = {}) {
  const maxHours = getAutoReportMaxHours();
  elements.workHoursInput.max = String(maxHours);

  if (AUTO_REPORT_TYPES.has(elements.reportTypeInput.value)) {
    if (setDefaultForAutoType) {
      elements.workHoursInput.value = String(maxHours);
    } else {
      const current = Number(elements.workHoursInput.value || 0);
      if (current > maxHours) elements.workHoursInput.value = String(maxHours);
      if (current < 0) elements.workHoursInput.value = '0';
    }
  }
}

async function loadOptionalProfileWeeklyHours(profileId) {
  if (!state.supabase || !profileId) return;

  const { data, error } = await state.supabase
    .from('app_profiles')
    .select('weekly_hours')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (message.includes('weekly_hours') && message.includes('does not exist')) return;
    console.warn('Weekly Hours konnte nicht geladen werden:', error.message);
    return;
  }

  if (!state.profile) return;
  state.profile = normalizeProfile({ ...state.profile, weekly_hours: Number(data?.weekly_hours || 0) || 0 });
  syncAutoReportHourConstraints();
}

function areProfileFieldsEqual(left, right) {
  return (
    (left?.email || '') === (right?.email || '') &&
    (left?.first_name || '') === (right?.first_name || '') &&
    (left?.last_name || '') === (right?.last_name || '') &&
    (left?.full_name || '') === (right?.full_name || '') &&
    (left?.role_label || '') === (right?.role_label || '') &&
    (left?.tel || '') === (right?.tel || '')
  );
}

function normalizeProfile(profile) {
  if (!profile) return null;
  const nameParts = splitFullName(profile.full_name || '');
  const firstName = profile.first_name || nameParts.firstName || '';
  const lastName = profile.last_name || nameParts.lastName || '';
  const roleLabel = ROLE_OPTIONS.includes(profile.role_label) ? profile.role_label : DEFAULT_ROLE_LABEL;

  return {
    ...profile,
    first_name: firstName,
    last_name: lastName,
    full_name: [firstName, lastName].filter(Boolean).join(' ').trim() || profile.full_name || '',
    role_label: roleLabel,
    tel: profile.tel || '',
    is_admin: Boolean(profile.is_admin)
  };
}

function fillSettingsForm() {
  const profile = normalizeProfile(state.profile);
  elements.firstNameInput.value = profile?.first_name || '';
  elements.lastNameInput.value = profile?.last_name || '';
  elements.phoneInput.value = profile?.tel || '';
}

async function ensureProfile(user, explicitFullName) {
  const fallbackName = explicitFullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Monteur';
  const nameParts = splitFullName(fallbackName);

  const { data: existingProfile, error: existingError } = await state.supabase
    .from('app_profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();

  if (existingError) {
    showToast(`Profil konnte nicht geladen werden: ${existingError.message}`, 'error');
    return;
  }

  const payload = existingProfile
    ? {
        email: user.email,
        first_name: existingProfile.first_name || nameParts.firstName || user.user_metadata?.first_name || fallbackName,
        last_name: existingProfile.last_name || nameParts.lastName || user.user_metadata?.last_name || '',
        full_name:
          existingProfile.full_name ||
          [existingProfile.first_name, existingProfile.last_name].filter(Boolean).join(' ').trim() ||
          fallbackName,
        role_label: ROLE_OPTIONS.includes(existingProfile.role_label) ? existingProfile.role_label : DEFAULT_ROLE_LABEL,
        tel: existingProfile.tel || ''
      }
    : {
        id: user.id,
        email: user.email,
        first_name: nameParts.firstName || user.user_metadata?.first_name || fallbackName,
        last_name: nameParts.lastName || user.user_metadata?.last_name || '',
        full_name: fallbackName,
        role_label: DEFAULT_ROLE_LABEL,
        tel: ''
      };

  if (existingProfile && areProfileFieldsEqual(existingProfile, payload)) {
    state.profile = normalizeProfile(existingProfile);
    fillSettingsForm();
    return;
  }

  const query = existingProfile
    ? state.supabase.from('app_profiles').update(payload).eq('id', user.id)
    : state.supabase.from('app_profiles').insert(payload);

  const { data, error } = await query.select(PROFILE_COLUMNS).single();
  if (error) {
    showToast(`Profil konnte nicht gespeichert werden: ${error.message}`, 'error');
    return;
  }

  state.profile = normalizeProfile(data);
  fillSettingsForm();
}

async function signIn(event) {
  event.preventDefault();
  if (!state.supabase) {
    showToast('Supabase ist noch nicht verbunden.', 'error');
    return;
  }

  await runWithFeedback(
    {
      button: elements.authSubmitBtn,
      section: elements.authCard,
      pendingMessage: 'Anmeldung wird durchgeführt …',
      loadingLabel: 'Anmeldung läuft …'
    },
    async () => {
      const email = elements.emailInput.value.trim();
      const password = elements.passwordInput.value;
      const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showToast(`Anmeldung fehlgeschlagen: ${error.message}`, 'error');
        return;
      }

      if (!data.user) {
        showToast('Anmeldung gestartet, aber es wurde noch keine Benutzersitzung zurückgegeben.', 'warning');
        return;
      }

      showToast('Erfolgreich angemeldet.');
      elements.authForm.reset();
      setAuthMode('login');
    }
  );
}

async function signUp() {
  if (!state.supabase) {
    showToast('Supabase ist noch nicht verbunden.', 'error');
    return;
  }

  const email = elements.emailInput.value.trim();
  const password = elements.passwordInput.value;
  const fullName = elements.fullNameInput.value.trim();

  if (!email || !password || !fullName) {
    showToast('Name, E-Mail und Passwort sind erforderlich.', 'error');
    return;
  }

  await runWithFeedback(
    {
      button: elements.authSubmitBtn,
      section: elements.authCard,
      pendingMessage: 'Konto wird erstellt …',
      loadingLabel: 'Konto wird erstellt …'
    },
    async () => {
      const { data, error } = await state.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) {
        showToast(`Konto konnte nicht erstellt werden: ${error.message}`, 'error');
        return;
      }

      if (!data.user) {
        showToast('Konto erstellt, aber es wurde noch keine Benutzersitzung zurückgegeben.', 'warning');
      } else {
        showToast('Konto erstellt. Bitte E-Mail-Bestätigung prüfen, falls aktiviert.');
      }
      elements.authForm.reset();
      setAuthMode('login');
    }
  );
}

async function handleAuthSubmit(event) {
  if (state.authMode === 'register') {
    event.preventDefault();
    await signUp();
    return;
  }

  await signIn(event);
}

async function startForgotPassword(event) {
  event.preventDefault();
  if (!state.supabase) {
    showToast('Supabase ist noch nicht verbunden.', 'error');
    return;
  }

  const email = elements.forgotEmailInput.value.trim().toLowerCase();
  if (!email) {
    showToast('Bitte E-Mail eingeben.', 'error');
    return;
  }

  await runWithFeedback(
    {
      button: elements.forgotPasswordSubmitBtn,
      section: elements.authCard,
      pendingMessage: 'Code wird per E-Mail gesendet …',
      loadingLabel: 'Code senden …'
    },
    async () => {
      const { error } = await state.supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: 'https://marechaux.io/mobile/'
        }
      });

      if (error) {
        showToast(`Code konnte nicht gesendet werden: ${error.message}`, 'error');
        return;
      }

      state.pendingOtpEmail = email;
      elements.otpCodeInput.value = '';
      setAuthMode('otp');
      showToast('Es wurde Ihnen eine E-Mail mit Code zugeschickt.');
    }
  );
}

async function verifyEmailOtp(event) {
  event.preventDefault();
  if (!state.supabase) {
    showToast('Supabase ist noch nicht verbunden.', 'error');
    return;
  }

  const token = elements.otpCodeInput.value.trim();
  if (!state.pendingOtpEmail || !/^\d{6}$/.test(token)) {
    showToast('Bitte einen gültigen 6-stelligen Code eingeben.', 'error');
    return;
  }

  await runWithFeedback(
    {
      button: elements.verifyOtpSubmitBtn,
      section: elements.authCard,
      pendingMessage: 'Code wird überprüft …',
      loadingLabel: 'Prüfen …'
    },
    async () => {
      const { data, error } = await state.supabase.auth.verifyOtp({
        email: state.pendingOtpEmail,
        token,
        type: 'email'
      });

      if (error) {
        showToast(`Code ungültig oder abgelaufen: ${error.message}`, 'error');
        return;
      }

      if (!data.user) {
        showToast('Code bestätigt, aber keine Benutzersitzung erhalten.', 'warning');
        return;
      }

      showToast('Code bestätigt. Du bist jetzt eingeloggt.');
      setAuthMode('login');
      elements.authForm.reset();
      elements.forgotPasswordForm.reset();
      elements.verifyOtpForm.reset();
      state.pendingOtpEmail = '';
    }
  );
}

async function saveSettings(event) {
  event.preventDefault();
  if (!state.supabase || !state.session?.user || !state.profile) {
    showToast('Bitte zuerst anmelden.', 'error');
    return;
  }

  const firstName = elements.firstNameInput.value.trim();
  const lastName = elements.lastNameInput.value.trim();
  const phone = elements.phoneInput.value.trim();

  if (!firstName || !lastName) {
    showToast('Vorname und Nachname sind erforderlich.', 'error');
    return;
  }

  await runWithFeedback(
    {
      button: elements.saveSettingsBtn,
      section: elements.settingsCard,
      pendingMessage: 'Account-Einstellungen werden gespeichert …',
      loadingLabel: 'Speichern …'
    },
    async () => {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        role_label: state.profile.role_label || DEFAULT_ROLE_LABEL,
        tel: phone
      };

      const { data, error } = await state.supabase
        .from('app_profiles')
        .update(payload)
        .eq('id', state.session.user.id)
        .select(PROFILE_COLUMNS)
        .single();

      if (error) {
        throw error;
      }

      state.profile = normalizeProfile(data);
      fillSettingsForm();
      render();
      showToast('Account-Einstellungen gespeichert.');
    }
  );
}

async function signOut() {
  await runWithFeedback(
    {
      button: elements.signOutBtn,
      section: elements.appView,
      pendingMessage: 'Abmeldung läuft …',
      loadingLabel: 'Abmeldung läuft …'
    },
    async () => {
      const { error } = await state.supabase.auth.signOut();
      if (error) {
        showToast(`Abmeldung fehlgeschlagen: ${error.message}`, 'error');
        return;
      }
      showToast('Erfolgreich abgemeldet.');
    }
  );
}

async function changePassword(event) {
  event.preventDefault();
  if (!state.supabase || !state.session?.user) {
    showToast('Bitte zuerst anmelden.', 'error');
    return;
  }

  const password = elements.newPasswordInput.value;
  const confirmPassword = elements.confirmPasswordInput.value;

  if (password.length < 6) {
    showToast('Das Passwort muss mindestens 6 Zeichen haben.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Die beiden Passwörter stimmen nicht überein.', 'error');
    return;
  }

  await runWithFeedback(
    {
      button: elements.changePasswordBtn,
      section: elements.passwordView,
      pendingMessage: 'Passwort wird geändert …',
      loadingLabel: 'Ändern …'
    },
    async () => {
      const { error } = await state.supabase.auth.updateUser({ password });
      if (error) {
        showToast(`Passwort konnte nicht geändert werden: ${error.message}`, 'error');
        return;
      }

      elements.passwordResetForm.reset();
      showToast('Passwort wurde erfolgreich geändert.');
      setCurrentView('settings');
    }
  );
}

async function loadEntries() {
  if (!state.session?.user) return;
  const requestId = ++state.latestEntriesRequestId;
  const days = getWeekDays();
  const currentProfileId = state.session.user.id;
  const searchPairs = Array.from(
    new Map(
      days.map((day) => {
        const year = day.date.getFullYear();
        const kw = getWeekNumber(day.date);
        return [`${year}-${kw}`, { year, kw }];
      })
    ).values()
  );

  let query = state.supabase
    .from('weekly_reports')
    .select(WEEKLY_REPORT_COLUMNS)
    .eq('profile_id', currentProfileId);

  if (searchPairs.length === 1) {
    query = query
      .eq('year', searchPairs[0].year)
      .eq('kw', searchPairs[0].kw);
  } else {
    const conditions = searchPairs
      .map((pair) => `and(year.eq.${pair.year},kw.eq.${pair.kw})`)
      .join(',');
    query = query.or(conditions);
  }

  const { data, error } = await query
    .order('work_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (requestId !== state.latestEntriesRequestId) return;

  if (error) {
    showToast(`Rapporte konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  state.entries = data || [];
}

async function loadHolidayRequests() {
  if (!state.session?.user) return;
  const requestId = ++state.latestHolidayRequestId;
  const currentProfileId = state.session.user.id;

  const { data, error } = await state.supabase
    .from('holiday_requests')
    .select(HOLIDAY_REQUEST_COLUMNS)
    .eq('profile_id', currentProfileId)
    .order('start_date', { ascending: false })
    .limit(12);

  if (requestId !== state.latestHolidayRequestId) return;

  if (error) {
    showToast(`Abwesenheiten konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  state.holidays = data || [];
}

function getEntriesForDate(isoDate) {
  return state.entries.filter((entry) => entry.work_date === isoDate);
}

function buildStoragePath(file, folderKey) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return `${state.session.user.id}/${folderKey}/${Date.now()}-${safeName}`;
}

function getAttachmentState(kind) {
  return kind === 'holiday'
    ? {
        draftKey: 'holidayDraftAttachments',
        pendingKey: 'holidayPendingFiles',
        block: elements.existingHolidayAttachmentsBlock,
        count: elements.holidayAttachmentCountLabel,
        list: elements.existingHolidayAttachmentsList,
        cameraInput: elements.holidayAttachmentsCameraInput,
        galleryInput: elements.holidayAttachmentsGalleryInput
      }
    : {
        draftKey: 'reportDraftAttachments',
        pendingKey: 'reportPendingFiles',
        block: elements.existingAttachmentsBlock,
        count: elements.attachmentCountLabel,
        list: elements.existingAttachmentsList,
        cameraInput: elements.attachmentsCameraInput,
        galleryInput: elements.attachmentsGalleryInput
      };
}

function revokePendingPreview(file) {
  if (file?.previewUrl) {
    URL.revokeObjectURL(file.previewUrl);
  }
}

function resetAttachmentState(kind, existingAttachments = []) {
  const config = getAttachmentState(kind);
  (state[config.pendingKey] || []).forEach(revokePendingPreview);
  state[config.pendingKey] = [];
  state[config.draftKey] = (existingAttachments || []).map((file) => ({ ...file, isExisting: true }));
  if (config.cameraInput) config.cameraInput.value = '';
  if (config.galleryInput) config.galleryInput.value = '';
}

function formatAttachmentMeta(file) {
  if (file.size) {
    const kiloBytes = file.size / 1024;
    if (kiloBytes < 1024) return `${Math.max(1, Math.round(kiloBytes))} KB`;
    return `${(kiloBytes / 1024).toFixed(1)} MB`;
  }

  if (file.mimeType === 'application/pdf') return 'PDF';
  return 'Datei';
}

function removeAttachment(kind, index, isPending) {
  const config = getAttachmentState(kind);
  if (isPending) {
    const [removed] = state[config.pendingKey].splice(index, 1);
    revokePendingPreview(removed);
  } else {
    state[config.draftKey].splice(index, 1);
  }
  renderAttachmentPreview(kind);
}

function getFileNameWithoutExtension(fileName = '') {
  return fileName.replace(/\.[^/.]+$/, '') || 'anhang';
}

function toPdfImageName(fileName, pageNumber) {
  const baseName = getFileNameWithoutExtension(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const normalizedBase = baseName || 'anhang';
  return `${normalizedBase}-seite-${pageNumber}.jpg`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Bild konnte nicht aus PDF-Seite erstellt werden.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function convertPdfToImageFiles(pdfFile) {
  if (!window.pdfjsLib) {
    throw new Error('PDF-Verarbeitung ist im Browser nicht verfügbar.');
  }

  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js';
  }

  const buffer = await pdfFile.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: buffer });
  const pdfDocument = await loadingTask.promise;
  const generatedFiles = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_IMAGE_SCALE });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      throw new Error('Canvas-Kontext konnte für PDF-Seite nicht erstellt werden.');
    }

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await canvasToBlob(canvas, PDF_IMAGE_TYPE, PDF_IMAGE_QUALITY);
    generatedFiles.push(
      new File([blob], toPdfImageName(pdfFile.name, pageNumber), {
        type: PDF_IMAGE_TYPE,
        lastModified: Date.now()
      })
    );
  }

  await loadingTask.destroy();
  return generatedFiles;
}

async function normalizeSelectedFiles(files) {
  const normalized = [];

  for (const file of Array.from(files || [])) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      normalized.push(file);
      continue;
    }

    const pdfAsImages = await convertPdfToImageFiles(file);
    normalized.push(...pdfAsImages);
  }

  return normalized;
}

async function handleAttachmentSelection(kind, files) {
  const config = getAttachmentState(kind);

  try {
    const pending = state[config.pendingKey];
    const selectedFiles = await normalizeSelectedFiles(files);

    selectedFiles.forEach((file) => {
      pending.push({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size || 0,
        file,
        isExisting: false,
        previewUrl: file.type?.startsWith('image/') ? URL.createObjectURL(file) : ''
      });
    });
  } catch (error) {
    console.error(error);
    showToast(`PDF konnte nicht verarbeitet werden: ${error.message}`, 'error');
  }

  if (config.cameraInput) config.cameraInput.value = '';
  if (config.galleryInput) config.galleryInput.value = '';
  renderAttachmentPreview(kind);
}

async function uploadAttachments(files, folderKey, existingFiles = []) {
  if (!files.length) return existingFiles;

  const uploaded = [...existingFiles];
  for (const file of files) {
    const filePath = buildStoragePath(file, folderKey);
    const { error } = await state.supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: false });
    if (error) throw error;

    const { data } = state.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    uploaded.push({
      name: file.name,
      path: filePath,
      publicUrl: data.publicUrl,
      mimeType: file.type || 'application/octet-stream'
    });
  }

  return uploaded;
}

function getEntryPayload() {
  const workDate = elements.entryDateInput.value;
  const parsedWorkDate = workDate ? parseLocalDate(workDate) : null;
  const reportYear = parsedWorkDate ? parsedWorkDate.getFullYear() : null;
  const reportWeek = parsedWorkDate ? getWeekNumber(parsedWorkDate) : null;
  const isAutoType = AUTO_REPORT_TYPES.has(elements.reportTypeInput.value);
  const isDetailedEntryMode = state.entryMode === ENTRY_MODE_DETAILED;
  const isDetailed = isAutoType || isDetailedEntryMode;
  const startTime = isDetailed ? (isAutoType ? DEFAULT_START_TIME : elements.startTimeInput.value) : '00:00';
  const endTime = isDetailed ? (isAutoType ? DEFAULT_END_TIME : elements.endTimeInput.value) : '00:00';
  const lunchMinutes = isDetailed ? (isAutoType ? 0 : Number(elements.lunchMinutesInput.value || 0)) : 0;
  const breakMinutes = isDetailed ? (isAutoType ? 0 : Number(elements.breakMinutesInput.value || 0)) : 0;
  const simpleDurationMinutes = parseDurationMinutes(elements.simpleDurationInput.value);
  const totalMinutes = isAutoType
    ? Math.round(Number(elements.workHoursInput.value || 0) * 60)
    : isDetailedEntryMode
      ? minutesBetween(startTime, endTime, lunchMinutes, breakMinutes)
      : simpleDurationMinutes;
  const adjustedTotalMinutes = isAutoType
    ? totalMinutes
    : isDetailedEntryMode
      ? calculateAdjustedWorkMinutes(workDate, startTime, endTime, totalMinutes, state.surchargeRules)
      : totalMinutes;
  const autoNote = isDetailed ? buildShiftBoundaryNote(workDate, startTime, endTime) : '';
  const absenceType = ABSENCE_TYPE_BY_REPORT_TYPE[elements.reportTypeInput.value] || 0;

  return {
    profile_id: state.session.user.id,
    work_date: workDate,
    year: reportYear,
    kw: reportWeek,
    project_name: elements.projectNameInput.value.trim(),
    commission_number: elements.commissionInput.value.trim(),
    start_time: startTime,
    end_time: endTime,
    lunch_break_minutes: lunchMinutes,
    additional_break_minutes: breakMinutes,
    total_work_minutes: totalMinutes,
    total_adjusted_work_minutes: adjustedTotalMinutes,
    expenses_amount: Number(elements.expensesInput.value || 0),
    other_costs_amount: Number(elements.otherCostsInput.value || 0),
    expense_note: null,
    notes: mergeShiftBoundaryNote(elements.notesInput.value, autoNote),
    abz_typ: absenceType
  };
}

function getHolidayPayload(existingAttachments) {
  return {
    profile_id: state.session.user.id,
    start_date: elements.holidayStartDateInput.value,
    end_date: elements.holidayEndDateInput.value,
    request_type: elements.holidayTypeInput.value,
    notes: elements.holidayNotesInput.value.trim(),
    attachments: existingAttachments
  };
}

function parseDurationMinutes(value) {
  const raw = String(value || '').trim();
  if (!raw) return NaN;
  if (raw.includes(':')) {
    const [h, m] = raw.split(':');
    const hours = Number(h);
    const minutes = Number(m);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) return NaN;
    return Math.round(hours * 60 + minutes);
  }
  const normalized = raw.replace(',', '.');
  const hours = Number(normalized);
  if (!Number.isFinite(hours)) return NaN;
  return Math.round(hours * 60);
}

function formatDurationForInput(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

function setEntryMode(mode) {
  const resolvedMode = mode === ENTRY_MODE_DETAILED ? ENTRY_MODE_DETAILED : ENTRY_MODE_SIMPLE;
  state.entryMode = resolvedMode;
  const isDetailed = resolvedMode === ENTRY_MODE_DETAILED;
  elements.simpleTimeFields.classList.toggle('hidden', isDetailed);
  elements.normalTimeFields.classList.toggle('hidden', !isDetailed);
  elements.startTimeInput.required = isDetailed;
  elements.endTimeInput.required = isDetailed;
  elements.simpleDurationInput.required = !isDetailed;
  elements.toggleEntryModeBtn.textContent = isDetailed ? 'Einfache Ansicht' : 'Detaillierte Ansicht';
}

function isSimpleEntryByTimes(entry) {
  return entry?.start_time === '00:00:00' && entry?.end_time === '00:00:00';
}

function getHolidayApprovalMeta(approvalStatus) {
  if (approvalStatus === HOLIDAY_APPROVAL_STATUS.rejected) {
    return { label: 'Abgelehnt', pillClass: 'danger' };
  }

  if (approvalStatus === HOLIDAY_APPROVAL_STATUS.approved) {
    return { label: 'Angenommen', pillClass: 'success' };
  }

  return { label: 'In Bearbeitung', pillClass: 'warning' };
}

async function saveEntry(event) {
  event.preventDefault();
  if (!state.supabase || !state.session?.user) {
    showToast('Bitte zuerst anmelden.', 'error');
    return;
  }

  const payload = getEntryPayload();
  const isAutoType = AUTO_REPORT_TYPES.has(elements.reportTypeInput.value);
  if (!payload.project_name) {
    showToast('Projektname fehlt.', 'error');
    return;
  }

  if (!isAutoType && !payload.commission_number) {
    showToast('Kommissionsnummer fehlt.', 'error');
    return;
  }

  const maxAutoMinutes = Math.round(getAutoReportMaxHours() * 60);
  if (isAutoType && (payload.total_work_minutes <= 0 || payload.total_work_minutes > maxAutoMinutes)) {
    showToast(`Zeit muss zwischen 0 und ${getAutoReportMaxHours()} Stunden liegen.`, 'error');
    return;
  }

  if (!isAutoType && payload.total_work_minutes <= 0) {
    showToast('Bitte gültige Arbeitszeit eingeben.', 'error');
    return;
  }
  if (!isAutoType && payload.total_work_minutes > 24 * 60) {
    showToast('Arbeitszeit darf maximal 24 Stunden betragen.', 'error');
    return;
  }

  if (commissionRequiresGeneralNote(payload.commission_number) && !payload.notes.trim()) {
    showToast('Bei Kommissionsnummern mit "K" ist eine allgemeine Bemerkung Pflicht.', 'error');
    return;
  }

  if (requiresExpenseAttachment(payload) && !entryHasAttachments()) {
    showToast('Für Sonstige Auslagen muss mindestens ein Beleg/Foto angehängt werden.', 'error');
    return;
  }

  const holidayConfig = getHolidayConfig();
  const isHolidayReportType = elements.reportTypeInput.value === (holidayConfig.reportType || 'feiertag');
  if (isHolidayReportType && payload.total_work_minutes > 0) {
    const holidayCompensation = await resolveHolidayCompensation(payload.work_date);
    payload.total_adjusted_work_minutes = Math.round(payload.total_work_minutes * holidayCompensation.multiplier);
  }

  try {
    await runWithFeedback(
      {
        button: elements.saveEntryBtn,
        section: elements.entryDrawer.querySelector('.drawer-panel'),
        pendingMessage: state.editingEntry?.id ? 'Eintrag wird aktualisiert …' : 'Eintrag wird gespeichert …',
        loadingLabel: state.editingEntry?.id ? 'Aktualisieren …' : 'Speichern …'
      },
      async () => {
        const existingAttachments = [...state.reportDraftAttachments];
        const attachments = await uploadAttachments(
          state.reportPendingFiles.map((item) => item.file),
          payload.work_date,
          existingAttachments
        );
        const body = { ...payload, attachments };

        let result;
        if (state.editingEntry?.id) {
          result = await state.supabase
            .from('weekly_reports')
            .update(body)
            .eq('id', state.editingEntry.id)
            .eq('profile_id', state.session.user.id)
            .select(WEEKLY_REPORT_COLUMNS)
            .single();
        } else {
          result = await state.supabase
            .from('weekly_reports')
            .insert(body)
            .select(WEEKLY_REPORT_COLUMNS)
            .single();
        }

        if (result.error) throw result.error;

        showToast(state.editingEntry?.id ? 'Eintrag aktualisiert.' : 'Eintrag gespeichert.');
        closeDrawer();
        await loadEntries();
        renderWeek();
      }
    );
  } catch (error) {
    console.error(error);
    showToast(`Speichern fehlgeschlagen: ${error.message}`, 'error');
  }
}

async function saveHolidayRequest(event) {
  event.preventDefault();
  if (!state.supabase || !state.session?.user) {
    showToast('Bitte zuerst anmelden.', 'error');
    return;
  }

  if (state.editingHoliday?.id) {
    showToast('Eingereichte Anträge können nicht mehr bearbeitet werden.', 'warning');
    return;
  }

  const startDate = elements.holidayStartDateInput.value;
  const endDate = elements.holidayEndDateInput.value;

  if (!startDate || !endDate) {
    showToast('Bitte Start- und Enddatum erfassen.', 'error');
    return;
  }

  if (endDate < startDate) {
    showToast('Das Enddatum darf nicht vor dem Startdatum liegen.', 'error');
    return;
  }

  try {
    await runWithFeedback(
      {
        button: elements.saveHolidayBtn,
        section: elements.holidayDrawer.querySelector('.drawer-panel'),
        pendingMessage: state.editingHoliday?.id ? 'Antrag wird aktualisiert …' : 'Antrag wird gespeichert …',
        loadingLabel: state.editingHoliday?.id ? 'Aktualisieren …' : 'Speichern …'
      },
      async () => {
        const existingAttachments = [...state.holidayDraftAttachments];
        const attachments = await uploadAttachments(
          state.holidayPendingFiles.map((item) => item.file),
          `holiday-${startDate}`,
          existingAttachments
        );

        const body = getHolidayPayload(attachments);
        let result;
        if (state.editingHoliday?.id) {
          result = await state.supabase
            .from('holiday_requests')
            .update(body)
            .eq('id', state.editingHoliday.id)
            .eq('profile_id', state.session.user.id)
            .select(HOLIDAY_REQUEST_COLUMNS)
            .single();
        } else {
          result = await state.supabase
            .from('holiday_requests')
            .insert(body)
            .select(HOLIDAY_REQUEST_COLUMNS)
            .single();
        }

        if (result.error) throw result.error;

        showToast(state.editingHoliday?.id ? 'Abwesenheitsantrag aktualisiert.' : 'Abwesenheitsantrag gespeichert.');
        closeHolidayDrawer();
        await loadHolidayRequests();
        renderHolidayRequests();
      }
    );
  } catch (error) {
    console.error(error);
    showToast(`Antrag konnte nicht gespeichert werden: ${error.message}`, 'error');
  }
}

async function deleteEntry() {
  if (!state.editingEntry?.id) return;
  if (!window.confirm('Diesen Rapport wirklich löschen?')) return;

  await runWithFeedback(
    {
      button: elements.deleteEntryBtn,
      section: elements.entryDrawer.querySelector('.drawer-panel'),
      pendingMessage: 'Eintrag wird gelöscht …',
      loadingLabel: 'Löschen …'
    },
    async () => {
      const { error } = await state.supabase
        .from('weekly_reports')
        .delete()
        .eq('id', state.editingEntry.id)
        .eq('profile_id', state.session.user.id);
      if (error) {
        showToast(`Löschen fehlgeschlagen: ${error.message}`, 'error');
        return;
      }

      showToast('Eintrag gelöscht.');
      closeDrawer();
      await loadEntries();
      renderWeek();
    }
  );
}

async function deleteHolidayRequest() {
  if (!state.editingHoliday?.id) return;
  if (!window.confirm('Diesen Abwesenheitsantrag wirklich löschen?')) return;

  await runWithFeedback(
    {
      button: elements.deleteHolidayBtn,
      section: elements.holidayDrawer.querySelector('.drawer-panel'),
      pendingMessage: 'Antrag wird gelöscht …',
      loadingLabel: 'Löschen …'
    },
    async () => {
      const { error } = await state.supabase
        .from('holiday_requests')
        .delete()
        .eq('id', state.editingHoliday.id)
        .eq('profile_id', state.session.user.id);
      if (error) {
        showToast(`Löschen fehlgeschlagen: ${error.message}`, 'error');
        return;
      }

      showToast('Abwesenheitsantrag gelöscht.');
      closeHolidayDrawer();
      await loadHolidayRequests();
      renderHolidayRequests();
    }
  );
}

function openDrawer(isoDate, entry = null) {
  state.selectedDate = isoDate;
  state.editingEntry = entry;
  const date = parseLocalDate(isoDate);
  const reportType =
    REPORT_TYPE_BY_ABSENCE_TYPE[Number(entry?.abz_typ) || 0] ||
    getReportTypeFromCommission(entry?.project_name || '') ||
    getReportTypeFromCommission(entry?.commission_number || '');

  elements.entryDrawer.classList.remove('hidden');
  elements.entryDrawer.setAttribute('aria-hidden', 'false');
  syncBodyScrollLock();
  elements.drawerDateLabel.textContent = formatDate(date);
  elements.drawerTitle.textContent = entry ? 'Rapport bearbeiten' : 'Neuer Eintrag';
  elements.entryIdInput.value = entry?.id || '';
  elements.entryDateInput.value = isoDate;
  elements.reportTypeInput.value = reportType;
  elements.reportTypeInput.dataset.previousValue = reportType;
  elements.projectNameInput.value = entry?.project_name || '';
  elements.commissionInput.value = entry?.commission_number || '';
  elements.startTimeInput.value = entry?.start_time || DEFAULT_START_TIME;
  elements.endTimeInput.value = entry?.end_time || DEFAULT_END_TIME;
  enforceQuarterHourInput(elements.startTimeInput);
  enforceQuarterHourInput(elements.endTimeInput);
  setSelectOrInputValue(elements.lunchMinutesInput, entry?.lunch_break_minutes ?? getAutomaticLunchMinutes(elements.startTimeInput.value, elements.endTimeInput.value));
  setSelectOrInputValue(elements.breakMinutesInput, entry?.additional_break_minutes ?? DEFAULT_BREAK_MINUTES);
  elements.workHoursInput.value = Math.min(getAutoReportMaxHours(), Math.max(0, Number(entry?.total_work_minutes || (DEFAULT_WORK_HOURS * 60)) / 60));
  const entryMode = entry ? (isSimpleEntryByTimes(entry) ? ENTRY_MODE_SIMPLE : ENTRY_MODE_DETAILED) : ENTRY_MODE_SIMPLE;
  elements.simpleDurationInput.value = formatDurationForInput(entry?.total_work_minutes ?? (DEFAULT_WORK_HOURS * 60));
  setEntryMode(entry ? entryMode : ENTRY_MODE_SIMPLE);
  elements.toggleEntryModeBtn.classList.toggle('hidden', Boolean(entry));
  elements.expensesInput.value = entry?.expenses_amount ?? 0;
  elements.expensesToggleInput.checked = Number(entry?.expenses_amount || 0) > 0;
  elements.otherCostsInput.value = entry?.other_costs_amount ?? 0;
  const mergedNotes = [entry?.notes, entry?.expense_note].map((value) => String(value || '').trim()).filter(Boolean).join('\n');
  elements.notesInput.value = mergedNotes;
  applyReportTypeSelection(reportType, { setDefaultAutoHours: !entry });
  loadProjectSuggestions().then(() => {
    renderCommissionSuggestions(elements.commissionInput.value);
    syncExpenseToggleState();
  });
  resetAttachmentState('report', entry?.attachments || []);
  elements.deleteEntryBtn.classList.toggle('hidden', !entry);
  renderAttachmentPreview('report');
}

function closeDrawer() {
  state.selectedDate = null;
  state.editingEntry = null;
  elements.entryDrawer.classList.add('hidden');
  elements.entryDrawer.setAttribute('aria-hidden', 'true');
  syncBodyScrollLock();
  elements.entryForm.reset();
  elements.reportTypeInput.value = '';
  elements.reportTypeInput.dataset.previousValue = '';
  elements.startTimeInput.value = DEFAULT_START_TIME;
  elements.endTimeInput.value = DEFAULT_END_TIME;
  enforceQuarterHourInput(elements.startTimeInput);
  enforceQuarterHourInput(elements.endTimeInput);
  setSelectOrInputValue(elements.lunchMinutesInput, getAutomaticLunchMinutes(DEFAULT_START_TIME, DEFAULT_END_TIME));
  setSelectOrInputValue(elements.breakMinutesInput, DEFAULT_BREAK_MINUTES);
  elements.workHoursInput.value = getAutoReportMaxHours();
  elements.simpleDurationInput.value = formatDurationForInput(DEFAULT_WORK_HOURS * 60);
  setEntryMode(ENTRY_MODE_SIMPLE);
  elements.toggleEntryModeBtn.classList.remove('hidden');
  elements.projectNameInput.value = '';
  elements.commissionInput.value = '';
  renderCommissionSuggestions('');
  elements.projectNameInput.readOnly = false;
  elements.commissionInput.readOnly = false;
  elements.expensesInput.readOnly = true;
  elements.expensesToggleInput.checked = false;
  elements.expensesToggleInput.disabled = false;
  applyReportTypeSelection('', { setDefaultAutoHours: false });
  resetAttachmentState('report', []);
  renderAttachmentPreview('report');
}

function openHolidayDrawer(holiday = null) {
  state.editingHoliday = holiday;
  const isExistingRequest = Boolean(holiday?.id);
  const actionLabel = holiday?.approval_status === HOLIDAY_APPROVAL_STATUS.pending ? 'Zurückziehen' : 'Löschen';
  elements.holidayIdInput.value = holiday?.id || '';
  elements.holidayStartDateInput.value = holiday?.start_date || getISODate(new Date());
  elements.holidayEndDateInput.value = holiday?.end_date || getISODate(new Date());
  elements.holidayTypeInput.value = holiday?.request_type || 'ferien';
  elements.holidayNotesInput.value = holiday?.notes || '';
  elements.holidayStartDateInput.disabled = isExistingRequest;
  elements.holidayEndDateInput.disabled = isExistingRequest;
  elements.holidayTypeInput.disabled = isExistingRequest;
  elements.holidayNotesInput.readOnly = isExistingRequest;
  elements.holidayAttachmentsCameraBtn.disabled = isExistingRequest;
  elements.holidayAttachmentsGalleryBtn.disabled = isExistingRequest;
  elements.saveHolidayBtn.classList.toggle('hidden', isExistingRequest);
  elements.deleteHolidayBtn.textContent = `Antrag ${actionLabel}`;
  resetAttachmentState('holiday', holiday?.attachments || []);
  elements.deleteHolidayBtn.classList.toggle('hidden', !isExistingRequest);
  renderAttachmentPreview('holiday');
}

function closeHolidayDrawer() {
  state.editingHoliday = null;
  elements.holidayForm.reset();
  resetAttachmentState('holiday', []);
  renderAttachmentPreview('holiday');
  elements.holidayStartDateInput.value = getISODate(new Date());
  elements.holidayEndDateInput.value = getISODate(new Date());
  elements.holidayStartDateInput.disabled = false;
  elements.holidayEndDateInput.disabled = false;
  elements.holidayTypeInput.disabled = false;
  elements.holidayNotesInput.readOnly = false;
  elements.holidayAttachmentsCameraBtn.disabled = false;
  elements.holidayAttachmentsGalleryBtn.disabled = false;
  elements.saveHolidayBtn.classList.remove('hidden');
  elements.deleteHolidayBtn.textContent = 'Antrag löschen';
}

function renderAttachmentPreview(kind) {
  const config = getAttachmentState(kind);
  const existingFiles = state[config.draftKey] || [];
  const pendingFiles = state[config.pendingKey] || [];
  const files = [...existingFiles, ...pendingFiles];

  config.block.classList.toggle('hidden', files.length === 0);
  config.count.textContent = `${files.length} Datei${files.length === 1 ? '' : 'en'}`;
  config.list.innerHTML = '';

  files.forEach((file, index) => {
    const item = document.createElement('article');
    const isPending = !file.isExisting;
    const isImage = (file.mimeType || '').startsWith('image/');
    item.className = 'attachment-item';

    const preview = document.createElement(file.publicUrl ? 'a' : 'div');
    preview.className = 'attachment-preview';
    if (file.publicUrl) {
      preview.href = file.publicUrl;
      preview.target = '_blank';
      preview.rel = 'noreferrer';
    }

    if (isImage) {
      const image = document.createElement('img');
      image.src = file.publicUrl || file.previewUrl;
      image.alt = file.name;
      preview.appendChild(image);
    } else {
      preview.innerHTML = '<span aria-hidden="true">📄</span>';
    }

    const body = document.createElement('div');
    body.className = 'attachment-item-body';
    body.innerHTML = `
      <strong>${file.name}</strong>
      <span>${isPending ? 'Neu hinzugefügt' : 'Bereits gespeichert'} • ${formatAttachmentMeta(file)}</span>
    `;

    const removeBtn = document.createElement('button');
    const allowAttachmentRemoval = !(kind === 'holiday' && state.editingHoliday?.id);
    removeBtn.type = 'button';
    removeBtn.className = 'ghost-btn attachment-remove-btn';
    removeBtn.textContent = 'Entfernen';
    removeBtn.disabled = !allowAttachmentRemoval;
    if (allowAttachmentRemoval) {
      removeBtn.addEventListener('click', () => removeAttachment(kind, isPending ? index - existingFiles.length : index, isPending));
    }

    item.append(preview, body, removeBtn);
    config.list.appendChild(item);
  });
}

function renderWeek() {
  const days = getWeekDays();
  const weekNumber = getWeekNumber(days[0].date);
  elements.weekRangeLabel.textContent = `${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}`;
  elements.currentWeekLabel.textContent = `KW ${weekNumber}`;

  elements.weekGrid.innerHTML = '';
  let totalMinutes = 0;
  let totalExpenses = 0;
  let totalEntries = 0;

  days.forEach((day) => {
    const fragment = elements.dayCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.day-card');
    const dayEntries = getEntriesForDate(day.iso);
    const dayMinutes = dayEntries.reduce((sum, entry) => sum + getEffectiveWorkMinutes(entry), 0);
    const dayExpenses = dayEntries.reduce(
      (sum, entry) => sum + Number(entry.expenses_amount || 0) + Number(entry.other_costs_amount || 0),
      0
    );

    totalMinutes += dayMinutes;
    totalExpenses += dayExpenses;
    totalEntries += dayEntries.length;

    fragment.querySelector('.weekday-label').textContent = day.label;
    fragment.querySelector('.day-date').textContent = formatDayMonth(day.date);
    fragment.querySelector('.day-meta').innerHTML = `
      <span class="pill neutral">${dayEntries.length} Einträge</span>
      <span class="pill neutral">${formatMinutes(dayMinutes)}</span>
      <span class="pill neutral">${formatCurrency(dayExpenses)}</span>
    `;

    fragment.querySelector('.add-entry-btn').addEventListener('click', () => openDrawer(day.iso));

    const list = fragment.querySelector('.entry-list');
    if (!dayEntries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Noch kein Rapport erfasst.';
      list.appendChild(empty);
    } else {
      dayEntries.forEach((entry) => {
        const entryNode = elements.entryCardTemplate.content.cloneNode(true);
        const button = entryNode.querySelector('.entry-card');
        button.querySelector('.entry-commission').textContent = entry.commission_number || '—';
        button.querySelector('.entry-project').textContent = truncateTextWithEllipsis(entry.project_name) || '—';
        button.querySelector('.entry-minutes').innerHTML = formatAdjustedEntryMinutes(entry);
        button.querySelector('.entry-expenses').textContent = formatCurrency(
          Number(entry.expenses_amount || 0) + Number(entry.other_costs_amount || 0)
        );
        button.querySelector('.entry-notes').textContent = String(entry.notes || '').trim() || 'Keine Bemerkung';
        button.addEventListener('click', () => openDrawer(day.iso, entry));
        list.appendChild(entryNode);
      });
    }

    elements.weekGrid.appendChild(card);
  });

  if (elements.weekEntryCount) elements.weekEntryCount.textContent = String(totalEntries);
  elements.weekMinutesTotal.textContent = formatMinutes(totalMinutes);
  elements.weekExpensesTotal.textContent = formatCurrency(totalExpenses);
}

function renderHolidayRequests() {
  const holidays = state.holidays || [];
  elements.holidayCountPill.textContent = `${holidays.length} Antrag${holidays.length === 1 ? '' : 'e'}`;
  elements.holidayList.innerHTML = '';

  if (!holidays.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Noch keine Ferien oder Absenzen erfasst.';
    elements.holidayList.appendChild(empty);
    return;
  }

  holidays.forEach((holiday) => {
    const article = document.createElement('article');
    article.className = 'request-item';

    const start = formatDate(parseLocalDate(holiday.start_date));
    const end = formatDate(parseLocalDate(holiday.end_date));
    const typeLabel = HOLIDAY_TYPE_LABELS[holiday.request_type] || holiday.request_type;
    const attachmentCount = Array.isArray(holiday.attachments) ? holiday.attachments.length : 0;
    const status = getHolidayApprovalMeta(Number(holiday.approval_status));
    const actionLabel = Number(holiday.approval_status) === HOLIDAY_APPROVAL_STATUS.pending ? 'Zurückziehen' : 'Löschen';

    article.innerHTML = `
      <div class="request-item-header">
        <h3>${typeLabel}</h3>
        <span class="pill neutral">${start} – ${end}</span>
      </div>
      <div class="request-item-meta">
        <p>${holiday.notes || 'Keine zusätzliche Bemerkung.'}</p>
        <span class="pill ${attachmentCount ? 'success' : 'neutral'}">${attachmentCount} Anhang${attachmentCount === 1 ? '' : 'e'}</span>
      </div>
      <div class="chip-list"></div>
      <div class="request-item-actions">
        <span class="pill ${status.pillClass}">${status.label}</span>
        <button class="secondary-btn" type="button">${actionLabel}</button>
      </div>
    `;

    const chipList = article.querySelector('.chip-list');
    (holiday.attachments || []).forEach((file) => {
      const link = document.createElement('a');
      link.className = 'file-chip';
      link.href = file.publicUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.innerHTML = `<span>📎</span><span>${file.name}</span>`;
      chipList.appendChild(link);
    });

    article.querySelector('button').addEventListener('click', () => openHolidayDrawer(holiday));
    elements.holidayList.appendChild(article);
  });
}

function render() {
  const isAuthenticated = Boolean(state.session?.user);
  closeNavMenu();
  elements.authCard.classList.toggle('hidden', isAuthenticated);
  elements.appView.classList.toggle('hidden', !isAuthenticated);
  elements.signOutBtn.classList.toggle('hidden', !isAuthenticated);

  if (isAuthenticated) {
    setPill(elements.authStatusPill, `Angemeldet als ${state.session.user.email}`, 'success');
    fillSettingsForm();
    renderWeek();
    renderHolidayRequests();
    setCurrentView(state.currentView);
  } else {
    state.currentView = 'timesheet';
    state.projectSuggestionsLoaded = false;
    state.projectSuggestions = [];
    setCurrentView('timesheet');
    elements.settingsForm?.reset();
    elements.phoneInput.value = '';
    elements.firstNameInput.value = '';
    elements.lastNameInput.value = '';
    setPill(elements.authStatusPill, state.supabase ? 'Nicht angemeldet' : 'Verbindung fehlt', state.supabase ? 'neutral' : 'danger');
    elements.weekGrid.innerHTML = '';
    elements.holidayList.innerHTML = '';
  }
}

async function handleWeekChange(offsetDelta) {
  state.weekOffset += offsetDelta;
  if (!state.session?.user) return;

  try {
    await loadEntries();
    renderWeek();
  } catch (error) {
    console.error(error);
    showToast(`Kalenderwoche konnte nicht geladen werden: ${error.message}`, 'error');
  }
}

function triggerFileInput(input) {
  if (!input) return;

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch (error) {
      console.warn('showPicker fehlgeschlagen, verwende click() Fallback.', error);
    }
  }

  input.click();
}

function registerEventListeners() {
  elements.authForm.addEventListener('submit', handleAuthSubmit);
  elements.toggleAuthModeBtn.addEventListener('click', () => setAuthMode(state.authMode === 'login' ? 'register' : 'login'));
  elements.forgotPasswordForm.addEventListener('submit', startForgotPassword);
  elements.verifyOtpForm.addEventListener('submit', verifyEmailOtp);
  elements.openForgotPasswordBtn.addEventListener('click', () => setAuthMode('forgot'));
  elements.cancelForgotPasswordBtn.addEventListener('click', () => {
    state.pendingOtpEmail = '';
    elements.forgotPasswordForm.reset();
    elements.verifyOtpForm.reset();
    setAuthMode('login');
  });
  elements.signOutBtn.addEventListener('click', signOut);
  elements.settingsForm.addEventListener('submit', saveSettings);
  elements.passwordResetForm.addEventListener('submit', changePassword);
  elements.prevWeekBtn.addEventListener('click', () => handleWeekChange(-1));
  elements.nextWeekBtn.addEventListener('click', () => handleWeekChange(1));
  elements.dashboardReportDownloadBtn?.addEventListener('click', async () => {
    if (state.dashboardReportDownloadLoading) return;
    const year = Number(elements.dashboardReportYearInput.value);
    const week = Number(elements.dashboardReportWeekInput.value);
    if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
      showToast('Bitte gültiges Jahr und KW wählen.', 'error');
      return;
    }
    state.dashboardReportDownloadLoading = true;
    elements.dashboardReportDownloadBtn.disabled = true;
    elements.dashboardReportDownloadBtn.textContent = 'PDF wird erstellt…';
    try {
      await exportWeekPdf({ year, week, currentUserOnly: true });
      showToast('Rapport wurde heruntergeladen.', 'success');
    } catch (error) {
      console.error(error);
      showToast(`PDF-Export fehlgeschlagen: ${error.message}`, 'error');
    } finally {
      state.dashboardReportDownloadLoading = false;
      elements.dashboardReportDownloadBtn.disabled = false;
      elements.dashboardReportDownloadBtn.textContent = 'Rapport Download';
    }
  });
  elements.navMenuToggleBtn?.addEventListener('click', toggleNavMenu);
  elements.navMenuBackdrop?.addEventListener('click', closeNavMenu);
  elements.navMenuItems?.forEach((item) => {
    item.addEventListener('click', () => {
      setCurrentView(item.dataset.navView);
      closeNavMenu();
    });
  });
  elements.openPasswordViewBtn.addEventListener('click', () => {
    setCurrentView('password');
  });
  elements.backToSettingsBtn.addEventListener('click', () => {
    setCurrentView('settings');
  });
  elements.entryForm.addEventListener('submit', saveEntry);
  elements.holidayForm.addEventListener('submit', saveHolidayRequest);
  elements.deleteEntryBtn.addEventListener('click', deleteEntry);
  elements.deleteHolidayBtn.addEventListener('click', deleteHolidayRequest);
  elements.closeDrawerLinkBtn.addEventListener('click', closeDrawer);
  elements.reportTypeInput.addEventListener('change', (event) => applyReportTypeSelection(event.target.value, { setDefaultAutoHours: true }));
  elements.toggleEntryModeBtn.addEventListener('click', () => {
    setEntryMode(state.entryMode === ENTRY_MODE_DETAILED ? ENTRY_MODE_SIMPLE : ENTRY_MODE_DETAILED);
    applyReportTypeSelection(elements.reportTypeInput.value, { setDefaultAutoHours: false });
  });
  elements.projectNameInput.addEventListener('input', syncReportTypeFromProjectOrCommission);
  elements.commissionInput.addEventListener('focus', () => {
    loadProjectSuggestions().then(() => renderCommissionSuggestions(elements.commissionInput.value));
  });
  elements.commissionInput.addEventListener('input', () => {
    handleCommissionInput().then(() => {
      if (findCommissionSuggestionMatch()) {
        closeKeyboardAndSuggestions(elements.commissionInput);
      }
    });
  });
  elements.commissionInput.addEventListener('blur', () => {
    window.setTimeout(hideCommissionSuggestionsList, 120);
  });
  elements.commissionInput.addEventListener('change', () => {
    syncProjectNameFromCommission();
    syncExpenseToggleState();
    closeKeyboardAndSuggestions(elements.commissionInput);
  });
  elements.commissionSuggestionsList?.addEventListener('mousedown', (event) => {
    const target = event.target.closest('.suggestion-item');
    if (!target) return;
    event.preventDefault();
  });
  elements.commissionSuggestionsList?.addEventListener('click', (event) => {
    const target = event.target.closest('.suggestion-item');
    if (!target) return;
    applyCommissionSuggestion(target.dataset.commission || '');
  });
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (elements.commissionInput.contains(target) || elements.commissionSuggestionsList?.contains(target)) return;
    hideCommissionSuggestionsList();
  });
  elements.expensesToggleInput.addEventListener('change', syncExpenseToggleState);
  elements.attachmentsCameraBtn.addEventListener('click', () => elements.attachmentsCameraInput.click());
  elements.attachmentsGalleryBtn.addEventListener(
    'click',
    () => triggerFileInput(elements.attachmentsGalleryInput)
  );
  elements.holidayAttachmentsCameraBtn.addEventListener('click', () => elements.holidayAttachmentsCameraInput.click());
  elements.holidayAttachmentsGalleryBtn.addEventListener(
    'click',
    () => triggerFileInput(elements.holidayAttachmentsGalleryInput)
  );
  elements.attachmentsCameraInput.addEventListener('change', (event) => handleAttachmentSelection('report', event.target.files));
  elements.attachmentsGalleryInput.addEventListener('change', (event) => handleAttachmentSelection('report', event.target.files));
  elements.holidayAttachmentsCameraInput.addEventListener('change', (event) => handleAttachmentSelection('holiday', event.target.files));
  elements.holidayAttachmentsGalleryInput.addEventListener('change', (event) => handleAttachmentSelection('holiday', event.target.files));
  const handleTimeInputChange = (event) => {
    enforceQuarterHourInput(event.target);
    syncNormalBreakRules();
  };

  elements.startTimeInput.addEventListener('input', (event) => enforceQuarterHourInput(event.target));
  elements.endTimeInput.addEventListener('input', (event) => enforceQuarterHourInput(event.target));
  elements.startTimeInput.addEventListener('change', handleTimeInputChange);
  elements.endTimeInput.addEventListener('change', handleTimeInputChange);
  elements.workHoursInput.addEventListener('input', () => {
    const value = Number(elements.workHoursInput.value || 0);
    const maxHours = getAutoReportMaxHours();
    if (value > maxHours) elements.workHoursInput.value = String(maxHours);
    if (value < 0) elements.workHoursInput.value = '0';
  });
  elements.entryForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      elements.workHoursInput.value = getAutoReportMaxHours();
      elements.simpleDurationInput.value = formatDurationForInput(DEFAULT_WORK_HOURS * 60);
      elements.startTimeInput.value = DEFAULT_START_TIME;
      elements.endTimeInput.value = DEFAULT_END_TIME;
      setSelectOrInputValue(elements.lunchMinutesInput, getAutomaticLunchMinutes(DEFAULT_START_TIME, DEFAULT_END_TIME));
      setSelectOrInputValue(elements.breakMinutesInput, DEFAULT_BREAK_MINUTES);
      elements.projectNameInput.readOnly = false;
      elements.commissionInput.readOnly = false;
      elements.expensesInput.readOnly = true;
      elements.expensesToggleInput.checked = false;
      elements.expensesToggleInput.disabled = false;
      applyReportTypeSelection('', { setDefaultAutoHours: false });
      setEntryMode(ENTRY_MODE_SIMPLE);
      resetAttachmentState('report', []);
      renderAttachmentPreview('report');
    }, 0);
  });
  elements.holidayForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      resetAttachmentState('holiday', []);
      renderAttachmentPreview('holiday');
    }, 0);
  });
  elements.entryDrawer.addEventListener('click', (event) => {
    if (event.target.dataset.closeDrawer === 'true') closeDrawer();
  });
}


function getAppBuildVersion() {
  return document.querySelector('meta[name="app-build-version"]')?.content || 'dev';
}

function showUpdateNotification() {
  showToast('Neue Version verfügbar – App wird aktualisiert.', 'info');
}

async function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const appVersion = encodeURIComponent(getAppBuildVersion());
  let hasReloadedForUpdate = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloadedForUpdate) return;
    hasReloadedForUpdate = true;
    window.location.reload();
  });

  const registration = await navigator.serviceWorker.register(`./sw.js?v=${appVersion}`, { updateViaCache: 'none' });

  const promptAndActivate = (worker) => {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateNotification();
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  };

  promptAndActivate(registration.installing);
  registration.addEventListener('updatefound', () => promptAndActivate(registration.installing));

  window.setInterval(() => registration.update().catch(() => null), 60 * 1000);
}

setAuthMode('login');
registerEventListeners();
const nowIsoWeek = getIsoWeekYearAndNumber(new Date());
if (elements.dashboardReportYearInput) elements.dashboardReportYearInput.value = String(nowIsoWeek.isoYear);
if (elements.dashboardReportWeekInput) elements.dashboardReportWeekInput.value = String(nowIsoWeek.isoWeek);
openHolidayDrawer();
syncAutoReportHourConstraints();
syncBodyScrollLock();
registerAppServiceWorker().catch(() => null);
loadConfig();
function roundTimeToQuarterHour(timeValue) {
  if (!timeValue || !timeValue.includes(':')) return timeValue;
  const [hourPart, minutePart] = timeValue.split(':');
  const hours = Number.parseInt(hourPart, 10);
  const minutes = Number.parseInt(minutePart, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return timeValue;

  const totalMinutes = Math.min(23 * 60 + 59, Math.max(0, hours * 60 + minutes));
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;
  const normalizedMinutes = ((roundedMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const normalizedHours = Math.floor(normalizedMinutes / 60);
  const normalizedMinutePart = normalizedMinutes % 60;
  return `${String(normalizedHours).padStart(2, '0')}:${String(normalizedMinutePart).padStart(2, '0')}`;
}

function enforceQuarterHourInput(input) {
  if (!input) return;
  const normalized = roundTimeToQuarterHour(input.value);
  if (normalized && normalized !== input.value) {
    input.value = normalized;
  }
}
