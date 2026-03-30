const CONFIG_PATH = './supabase-config.json';
const SURCHARGE_RULES_PATH = './surcharge-rules.json';
const STORAGE_BUCKET = 'weekly-attachments';
const DEFAULT_START_TIME = '07:00';
const DEFAULT_END_TIME = '16:30';
const DEFAULT_WORK_HOURS = 8;
const DEFAULT_BREAK_MINUTES = 0;
const LONG_SHIFT_THRESHOLD_MINUTES = 7 * 60;
const LONG_SHIFT_LUNCH_MINUTES = 60;
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
const HOLIDAY_TYPE_LABELS = {
  ferien: 'Urlaub / Ferien',
  militaer: 'Militär',
  zivildienst: 'Zivildienst',
  unfall: 'Unfall',
  krankheit: 'Krankheit'
};
const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const WEEKDAY_ABBREVIATIONS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
const NIGHT_SHIFT_NOTE_PREFIX = 'Arbeitszeit, Nachtzeit';
const DAY_SHIFT_START_MINUTES = 6 * 60;
const DAY_SHIFT_END_MINUTES = 22 * 60;
const PROFILE_COLUMNS = 'id, email, first_name, last_name, full_name, role_label, tel, is_admin';
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
  'created_at',
  'updated_at'
].join(', ');
const DEFAULT_SURCHARGE_RULES = {
  version: 1,
  timezone: 'Europe/Zurich',
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
  'notes',
  'attachments',
  'created_at',
  'updated_at'
].join(', ');

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
  currentView: 'dashboard',
  latestEntriesRequestId: 0,
  latestHolidayRequestId: 0,
  reportDraftAttachments: [],
  reportPendingFiles: [],
  holidayDraftAttachments: [],
  holidayPendingFiles: [],
  surchargeRules: DEFAULT_SURCHARGE_RULES
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
  welcomeHeading: document.getElementById('welcomeHeading'),
  userNameLabel: document.getElementById('userNameLabel'),
  dashboardHeroCard: document.getElementById('dashboardHeroCard'),
  dashboardWeekPanel: document.getElementById('dashboardWeekPanel'),
  weekRangeLabel: document.getElementById('weekRangeLabel'),
  weekGrid: document.getElementById('weekGrid'),
  weekEntryCount: document.getElementById('weekEntryCount'),
  weekMinutesTotal: document.getElementById('weekMinutesTotal'),
  weekExpensesTotal: document.getElementById('weekExpensesTotal'),
  summaryCard: document.getElementById('summaryCard'),
  prevWeekBtn: document.getElementById('prevWeekBtn'),
  nextWeekBtn: document.getElementById('nextWeekBtn'),
  currentWeekLabel: document.getElementById('currentWeekLabel'),
  openHolidayDrawerBtn: document.getElementById('openHolidayDrawerBtn'),
  openSettingsViewBtn: document.getElementById('openSettingsViewBtn'),
  settingsView: document.getElementById('settingsView'),
  settingsOverviewCard: document.getElementById('settingsOverviewCard'),
  backToDashboardBtn: document.getElementById('backToDashboardBtn'),
  requestsCard: document.getElementById('requestsCard'),
  holidayList: document.getElementById('holidayList'),
  holidayCountPill: document.getElementById('holidayCountPill'),
  settingsCard: document.getElementById('settingsCard'),
  adminStatusPill: document.getElementById('adminStatusPill'),
  settingsForm: document.getElementById('settingsForm'),
  firstNameInput: document.getElementById('firstNameInput'),
  lastNameInput: document.getElementById('lastNameInput'),
  roleLabelInput: document.getElementById('roleLabelInput'),
  phoneInput: document.getElementById('phoneInput'),
  settingsEmailInput: document.getElementById('settingsEmailInput'),
  isAdminInput: document.getElementById('isAdminInput'),
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
  normalTimeFields: document.getElementById('normalTimeFields'),
  specialTimeFields: document.getElementById('specialTimeFields'),
  startTimeInput: document.getElementById('startTimeInput'),
  endTimeInput: document.getElementById('endTimeInput'),
  lunchMinutesInput: document.getElementById('lunchMinutesInput'),
  breakMinutesInput: document.getElementById('breakMinutesInput'),
  workHoursInput: document.getElementById('workHoursInput'),
  expensesInput: document.getElementById('expensesInput'),
  otherCostsInput: document.getElementById('otherCostsInput'),
  expenseNoteInput: document.getElementById('expenseNoteInput'),
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
    !elements.holidayDrawer.classList.contains('hidden');
  document.body.classList.toggle('drawer-open', hasOpenDrawer);
}

function setCurrentView(view) {
  state.currentView = ['settings', 'password'].includes(view) ? view : 'dashboard';
  const inSettings = state.currentView !== 'dashboard';
  const inPassword = state.currentView === 'password';

  elements.settingsView?.classList.toggle('hidden', !inSettings);
  elements.dashboardHeroCard?.classList.toggle('hidden', inSettings);
  elements.dashboardWeekPanel?.classList.toggle('hidden', inSettings);
  elements.signOutBtn?.classList.toggle('hidden', inSettings);
  elements.weekGrid?.classList.toggle('hidden', inSettings);
  elements.summaryCard?.classList.toggle('hidden', inSettings);
  elements.openSettingsViewBtn?.classList.toggle('hidden', inSettings);
  elements.openHolidayDrawerBtn?.classList.toggle('hidden', inSettings);
  elements.settingsOverviewCard?.classList.toggle('hidden', inPassword);
  elements.settingsCard?.classList.toggle('hidden', inPassword);
  elements.requestsCard?.classList.toggle('hidden', inPassword);
  elements.passwordView?.classList.toggle('hidden', !inPassword);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(Number(value || 0));
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
  return (
    Number(payload.other_costs_amount || 0) > 0 ||
    Boolean(payload.expense_note)
  );
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

function getWeekdayAbbreviation(isoDate) {
  if (!isoDate) return '';
  const date = parseLocalDate(isoDate);
  return WEEKDAY_ABBREVIATIONS[date.getDay()] || '';
}

function buildShiftBoundaryNote(workDate, startTime, endTime) {
  if (!shiftOverlapsNightWindow(startTime, endTime)) {
    return '';
  }

  const weekday = getWeekdayAbbreviation(workDate);
  return `${NIGHT_SHIFT_NOTE_PREFIX} (${weekday}): ${startTime} - ${endTime}`;
}

function mergeShiftBoundaryNote(notes, autoNote) {
  const lines = String(notes || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(`${NIGHT_SHIFT_NOTE_PREFIX} (`) && !line.startsWith(`Nachtzeit (`));

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

function applyReportTypeSelection(reportType) {
  const reportLabel = REPORT_TYPE_LABELS[reportType] || '';
  const isAutoType = AUTO_REPORT_TYPES.has(reportType);

  if (reportLabel) {
    elements.projectNameInput.value = reportLabel;
    elements.commissionInput.value = '';
  } else if (AUTO_REPORT_TYPES.has(elements.reportTypeInput.dataset.previousValue || '')) {
    elements.projectNameInput.value = '';
    elements.commissionInput.value = '';
  }

  if (reportType === 'uk') {
    elements.expensesInput.value = 18;
  }
  elements.normalTimeFields.classList.toggle('hidden', isAutoType);
  elements.specialTimeFields.classList.toggle('hidden', !isAutoType);
  elements.startTimeInput.required = !isAutoType;
  elements.endTimeInput.required = !isAutoType;
  elements.workHoursInput.required = isAutoType;
  elements.projectNameInput.readOnly = isAutoType;
  elements.commissionInput.readOnly = isAutoType;
  elements.expensesInput.readOnly = reportType === 'uk';
  elements.reportTypeInput.dataset.previousValue = reportType;
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

  return {
    ...profile,
    first_name: firstName,
    last_name: lastName,
    full_name: [firstName, lastName].filter(Boolean).join(' ').trim() || profile.full_name || '',
    role_label: profile.role_label || 'Monteur',
    tel: profile.tel || '',
    is_admin: Boolean(profile.is_admin)
  };
}

function fillSettingsForm() {
  const profile = normalizeProfile(state.profile);
  elements.firstNameInput.value = profile?.first_name || '';
  elements.lastNameInput.value = profile?.last_name || '';
  elements.roleLabelInput.value = profile?.role_label || 'Monteur';
  elements.phoneInput.value = profile?.tel || '';
  elements.settingsEmailInput.value = state.session?.user?.email || profile?.email || '';
  elements.isAdminInput.value = profile?.is_admin ? 'true' : 'false';
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
        role_label: existingProfile.role_label || 'Monteur',
        tel: existingProfile.tel || ''
      }
    : {
        id: user.id,
        email: user.email,
        first_name: nameParts.firstName || user.user_metadata?.first_name || fallbackName,
        last_name: nameParts.lastName || user.user_metadata?.last_name || '',
        full_name: fallbackName,
        role_label: 'Monteur',
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
        options: { shouldCreateUser: false }
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
  const roleLabel = elements.roleLabelInput.value.trim();
  const phone = elements.phoneInput.value.trim();

  if (!firstName || !lastName || !roleLabel) {
    showToast('Vorname, Nachname und Rolle sind erforderlich.', 'error');
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
        role_label: roleLabel,
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

function handleAttachmentSelection(kind, files) {
  const config = getAttachmentState(kind);
  const pending = state[config.pendingKey];

  Array.from(files || []).forEach((file) => {
    pending.push({
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size || 0,
      file,
      isExisting: false,
      previewUrl: file.type?.startsWith('image/') ? URL.createObjectURL(file) : ''
    });
  });

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
  const startTime = isAutoType ? DEFAULT_START_TIME : elements.startTimeInput.value;
  const endTime = isAutoType ? DEFAULT_END_TIME : elements.endTimeInput.value;
  const lunchMinutes = isAutoType ? 0 : Number(elements.lunchMinutesInput.value || 0);
  const breakMinutes = isAutoType ? 0 : Number(elements.breakMinutesInput.value || 0);
  const totalMinutes = isAutoType
    ? Math.round(Number(elements.workHoursInput.value || 0) * 60)
    : minutesBetween(startTime, endTime, lunchMinutes, breakMinutes);
  const adjustedTotalMinutes = isAutoType
    ? totalMinutes
    : calculateAdjustedWorkMinutes(workDate, startTime, endTime, totalMinutes, state.surchargeRules);
  const autoNote = buildShiftBoundaryNote(workDate, startTime, endTime);

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
    expense_note: elements.expenseNoteInput.value.trim(),
    notes: mergeShiftBoundaryNote(elements.notesInput.value, autoNote)
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

  if (isAutoType && (payload.total_work_minutes <= 0 || payload.total_work_minutes > 8 * 60)) {
    showToast('Zeit muss zwischen 0 und 8 Stunden liegen.', 'error');
    return;
  }

  if (!isAutoType && payload.total_work_minutes <= 0) {
    showToast('Bitte gültige Arbeitszeit eingeben.', 'error');
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
  setSelectOrInputValue(elements.lunchMinutesInput, entry?.lunch_break_minutes ?? getAutomaticLunchMinutes(elements.startTimeInput.value, elements.endTimeInput.value));
  setSelectOrInputValue(elements.breakMinutesInput, entry?.additional_break_minutes ?? DEFAULT_BREAK_MINUTES);
  elements.workHoursInput.value = Math.min(8, Math.max(0, Number(entry?.total_work_minutes || (DEFAULT_WORK_HOURS * 60)) / 60));
  elements.expensesInput.value = entry?.expenses_amount ?? 0;
  elements.otherCostsInput.value = entry?.other_costs_amount ?? 0;
  elements.expenseNoteInput.value = entry?.expense_note || '';
  elements.notesInput.value = entry?.notes || '';
  applyReportTypeSelection(reportType);
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
  setSelectOrInputValue(elements.lunchMinutesInput, getAutomaticLunchMinutes(DEFAULT_START_TIME, DEFAULT_END_TIME));
  setSelectOrInputValue(elements.breakMinutesInput, DEFAULT_BREAK_MINUTES);
  elements.workHoursInput.value = DEFAULT_WORK_HOURS;
  elements.projectNameInput.value = '';
  elements.commissionInput.value = '';
  elements.projectNameInput.readOnly = false;
  elements.commissionInput.readOnly = false;
  elements.expensesInput.readOnly = false;
  applyReportTypeSelection('');
  resetAttachmentState('report', []);
  renderAttachmentPreview('report');
}

function openHolidayDrawer(holiday = null) {
  state.editingHoliday = holiday;
  elements.holidayDrawer.classList.remove('hidden');
  elements.holidayDrawer.setAttribute('aria-hidden', 'false');
  syncBodyScrollLock();
  elements.holidayIdInput.value = holiday?.id || '';
  elements.holidayStartDateInput.value = holiday?.start_date || getISODate(new Date());
  elements.holidayEndDateInput.value = holiday?.end_date || getISODate(new Date());
  elements.holidayTypeInput.value = holiday?.request_type || 'ferien';
  elements.holidayNotesInput.value = holiday?.notes || '';
  resetAttachmentState('holiday', holiday?.attachments || []);
  elements.deleteHolidayBtn.classList.toggle('hidden', !holiday);
  renderAttachmentPreview('holiday');
}

function closeHolidayDrawer() {
  state.editingHoliday = null;
  elements.holidayDrawer.classList.add('hidden');
  elements.holidayDrawer.setAttribute('aria-hidden', 'true');
  syncBodyScrollLock();
  elements.holidayForm.reset();
  resetAttachmentState('holiday', []);
  renderAttachmentPreview('holiday');
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
    removeBtn.type = 'button';
    removeBtn.className = 'ghost-btn attachment-remove-btn';
    removeBtn.textContent = 'Entfernen';
    removeBtn.addEventListener('click', () => removeAttachment(kind, isPending ? index - existingFiles.length : index, isPending));

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
        button.querySelector('.entry-project').textContent = entry.project_name || '—';
        button.querySelector('.entry-minutes').innerHTML = formatAdjustedEntryMinutes(entry);
        button.querySelector('.entry-expenses').textContent = formatCurrency(
          Number(entry.expenses_amount || 0) + Number(entry.other_costs_amount || 0)
        );
        button.querySelector('.entry-notes').textContent = String(entry.notes || '').trim() || 'Keine Bemerkung.';
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
        <button class="secondary-btn" type="button">Bearbeiten</button>
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
  elements.authCard.classList.toggle('hidden', isAuthenticated);
  elements.appView.classList.toggle('hidden', !isAuthenticated);
  elements.signOutBtn.classList.toggle('hidden', !isAuthenticated);

  if (isAuthenticated) {
    setPill(elements.authStatusPill, `Angemeldet als ${state.session.user.email}`, 'success');
    elements.welcomeHeading.textContent = 'Dashboard';
    elements.userNameLabel.textContent = getDisplayName(state.profile, state.session.user.email);
    fillSettingsForm();
    renderWeek();
    renderHolidayRequests();
    setCurrentView(state.currentView);
  } else {
    state.currentView = 'dashboard';
    elements.welcomeHeading.textContent = 'Dashboard';
    elements.userNameLabel.textContent = '–';
    setCurrentView('dashboard');
    elements.settingsForm?.reset();
    elements.isAdminInput.value = '';
    elements.settingsEmailInput.value = '';
    elements.phoneInput.value = '';
    elements.firstNameInput.value = '';
    elements.lastNameInput.value = '';
    elements.roleLabelInput.value = '';
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
  elements.openHolidayDrawerBtn.addEventListener('click', () => openHolidayDrawer());
  elements.openSettingsViewBtn.addEventListener('click', () => {
    setCurrentView('settings');
  });
  elements.openPasswordViewBtn.addEventListener('click', () => {
    setCurrentView('password');
  });
  elements.backToDashboardBtn?.addEventListener('click', () => {
    setCurrentView('dashboard');
  });
  elements.backToSettingsBtn.addEventListener('click', () => {
    setCurrentView('settings');
  });
  elements.entryForm.addEventListener('submit', saveEntry);
  elements.holidayForm.addEventListener('submit', saveHolidayRequest);
  elements.deleteEntryBtn.addEventListener('click', deleteEntry);
  elements.deleteHolidayBtn.addEventListener('click', deleteHolidayRequest);
  elements.closeDrawerLinkBtn.addEventListener('click', closeDrawer);
  elements.closeHolidayDrawerBtn.addEventListener('click', closeHolidayDrawer);
  elements.reportTypeInput.addEventListener('change', (event) => applyReportTypeSelection(event.target.value));
  elements.attachmentsCameraBtn.addEventListener('click', () => elements.attachmentsCameraInput.click());
  elements.attachmentsGalleryBtn.addEventListener('click', () => elements.attachmentsGalleryInput.click());
  elements.holidayAttachmentsCameraBtn.addEventListener('click', () => elements.holidayAttachmentsCameraInput.click());
  elements.holidayAttachmentsGalleryBtn.addEventListener('click', () => elements.holidayAttachmentsGalleryInput.click());
  elements.attachmentsCameraInput.addEventListener('change', (event) => handleAttachmentSelection('report', event.target.files));
  elements.attachmentsGalleryInput.addEventListener('change', (event) => handleAttachmentSelection('report', event.target.files));
  elements.holidayAttachmentsCameraInput.addEventListener('change', (event) => handleAttachmentSelection('holiday', event.target.files));
  elements.holidayAttachmentsGalleryInput.addEventListener('change', (event) => handleAttachmentSelection('holiday', event.target.files));
  elements.startTimeInput.addEventListener('change', syncNormalBreakRules);
  elements.endTimeInput.addEventListener('change', syncNormalBreakRules);
  elements.workHoursInput.addEventListener('input', () => {
    const value = Number(elements.workHoursInput.value || 0);
    if (value > 8) elements.workHoursInput.value = '8';
    if (value < 0) elements.workHoursInput.value = '0';
  });
  elements.entryForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      elements.workHoursInput.value = DEFAULT_WORK_HOURS;
      elements.startTimeInput.value = DEFAULT_START_TIME;
      elements.endTimeInput.value = DEFAULT_END_TIME;
      setSelectOrInputValue(elements.lunchMinutesInput, getAutomaticLunchMinutes(DEFAULT_START_TIME, DEFAULT_END_TIME));
      setSelectOrInputValue(elements.breakMinutesInput, DEFAULT_BREAK_MINUTES);
      elements.projectNameInput.readOnly = false;
      elements.commissionInput.readOnly = false;
      elements.expensesInput.readOnly = false;
      applyReportTypeSelection('');
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
  elements.holidayDrawer.addEventListener('click', (event) => {
    if (event.target.dataset.closeHolidayDrawer === 'true') closeHolidayDrawer();
  });
}

setAuthMode('login');
registerEventListeners();
syncBodyScrollLock();
loadConfig();
