const CONFIG_PATH = './supabase-config.json';
const STORAGE_BUCKET = 'weekly-attachments';
const DEFAULT_START_TIME = '07:00';
const DEFAULT_END_TIME = '16:30';
const DEFAULT_LUNCH_MINUTES = 60;
const DEFAULT_BREAK_MINUTES = 30;
const REPORT_TYPE_LABELS = {
  ferien: 'Ferien',
  krankheit: 'Krankheit',
  militaer: 'Militär',
  unfall: 'Unfall',
  feiertag: 'Feiertag'
};
const HOLIDAY_TYPE_LABELS = {
  ferien: 'Urlaub / Ferien',
  militaer: 'Militär',
  zivildienst: 'Zivildienst',
  unfall: 'Unfall',
  krankheit: 'Krankheit'
};
const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const PROFILE_COLUMNS = 'id, email, first_name, last_name, full_name, role_label, is_admin';
const WEEKLY_REPORT_COLUMNS = [
  'id',
  'profile_id',
  'work_date',
  'commission_number',
  'start_time',
  'end_time',
  'lunch_break_minutes',
  'additional_break_minutes',
  'total_work_minutes',
  'expenses_amount',
  'other_costs_amount',
  'expense_note',
  'notes',
  'attachments',
  'created_at',
  'updated_at'
].join(', ');
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
  holidayPendingFiles: []
};

const elements = {
  authCard: document.getElementById('authCard'),
  authTitle: document.getElementById('authTitle'),
  authSubtitle: document.getElementById('authSubtitle'),
  authStatusPill: document.getElementById('authStatusPill'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authSwitchText: document.getElementById('authSwitchText'),
  toggleAuthModeBtn: document.getElementById('toggleAuthModeBtn'),
  fullNameField: document.getElementById('fullNameField'),
  signOutBtn: document.getElementById('signOutBtn'),
  appView: document.getElementById('appView'),
  authForm: document.getElementById('authForm'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  fullNameInput: document.getElementById('fullNameInput'),
  welcomeHeading: document.getElementById('welcomeHeading'),
  userNameLabel: document.getElementById('userNameLabel'),
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
  backToDashboardBtn: document.getElementById('backToDashboardBtn'),
  holidayList: document.getElementById('holidayList'),
  holidayCountPill: document.getElementById('holidayCountPill'),
  settingsCard: document.getElementById('settingsCard'),
  adminStatusPill: document.getElementById('adminStatusPill'),
  settingsForm: document.getElementById('settingsForm'),
  firstNameInput: document.getElementById('firstNameInput'),
  lastNameInput: document.getElementById('lastNameInput'),
  roleLabelInput: document.getElementById('roleLabelInput'),
  settingsEmailInput: document.getElementById('settingsEmailInput'),
  isAdminInput: document.getElementById('isAdminInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  entryDrawer: document.getElementById('entryDrawer'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  closeDrawerLinkBtn: document.getElementById('closeDrawerLinkBtn'),
  drawerTitle: document.getElementById('drawerTitle'),
  drawerDateLabel: document.getElementById('drawerDateLabel'),
  entryForm: document.getElementById('entryForm'),
  entryIdInput: document.getElementById('entryIdInput'),
  entryDateInput: document.getElementById('entryDateInput'),
  reportTypeInput: document.getElementById('reportTypeInput'),
  commissionInput: document.getElementById('commissionInput'),
  startTimeInput: document.getElementById('startTimeInput'),
  endTimeInput: document.getElementById('endTimeInput'),
  lunchMinutesInput: document.getElementById('lunchMinutesInput'),
  breakMinutesInput: document.getElementById('breakMinutesInput'),
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

function setCurrentView(view) {
  state.currentView = view === 'settings' ? 'settings' : 'dashboard';
  elements.settingsView?.classList.toggle('hidden', state.currentView !== 'settings');
  elements.weekGrid?.classList.toggle('hidden', state.currentView === 'settings');
  elements.summaryCard?.classList.toggle('hidden', state.currentView === 'settings');
  elements.openSettingsViewBtn?.classList.toggle('hidden', state.currentView === 'settings');
  elements.openHolidayDrawerBtn?.classList.toggle('hidden', state.currentView === 'settings');
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

function minutesBetween(startTime, endTime, lunchMinutes, breakMinutes) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const raw = end < start ? (24 * 60 - start) + end : end - start;
  return Math.max(0, raw - Number(lunchMinutes || 0) - Number(breakMinutes || 0));
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

function getReportTypeFromCommission(commissionNumber = '') {
  const normalizedCommission = commissionNumber.trim().toLowerCase();
  return (
    Object.entries(REPORT_TYPE_LABELS).find(([, label]) => label.toLowerCase() === normalizedCommission)?.[0] ||
    ''
  );
}

function applyReportTypeSelection(reportType) {
  const reportLabel = REPORT_TYPE_LABELS[reportType] || '';
  const previousAutoLabel = REPORT_TYPE_LABELS[elements.reportTypeInput.dataset.previousValue] || '';
  const currentCommission = elements.commissionInput.value.trim();

  if (reportLabel) {
    elements.commissionInput.value = reportLabel;
    elements.startTimeInput.value = DEFAULT_START_TIME;
    elements.endTimeInput.value = DEFAULT_END_TIME;
    elements.lunchMinutesInput.value = DEFAULT_LUNCH_MINUTES;
    elements.breakMinutesInput.value = DEFAULT_BREAK_MINUTES;
  } else if (previousAutoLabel && currentCommission === previousAutoLabel) {
    elements.commissionInput.value = '';
  }

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
  state.authMode = mode;
  const isRegister = mode === 'register';
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
    const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error('Konfigurationsdatei nicht gefunden.');

    const config = await response.json();
    state.config = config;

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
    (left?.role_label || '') === (right?.role_label || '')
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
    is_admin: Boolean(profile.is_admin)
  };
}

function fillSettingsForm() {
  const profile = normalizeProfile(state.profile);
  elements.firstNameInput.value = profile?.first_name || '';
  elements.lastNameInput.value = profile?.last_name || '';
  elements.roleLabelInput.value = profile?.role_label || 'Monteur';
  elements.settingsEmailInput.value = state.session?.user?.email || profile?.email || '';
  elements.isAdminInput.value = profile?.is_admin ? 'true' : 'false';
  setPill(elements.adminStatusPill, `Admin: ${profile?.is_admin ? 'ja' : 'nein'}`, profile?.is_admin ? 'warning' : 'neutral');
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
        role_label: existingProfile.role_label || 'Monteur'
      }
    : {
        id: user.id,
        email: user.email,
        first_name: nameParts.firstName || user.user_metadata?.first_name || fallbackName,
        last_name: nameParts.lastName || user.user_metadata?.last_name || '',
        full_name: fallbackName,
        role_label: 'Monteur'
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

async function saveSettings(event) {
  event.preventDefault();
  if (!state.supabase || !state.session?.user || !state.profile) {
    showToast('Bitte zuerst anmelden.', 'error');
    return;
  }

  const firstName = elements.firstNameInput.value.trim();
  const lastName = elements.lastNameInput.value.trim();
  const roleLabel = elements.roleLabelInput.value.trim();

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
        role_label: roleLabel
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

async function loadEntries() {
  if (!state.session?.user) return;
  const requestId = ++state.latestEntriesRequestId;
  const days = getWeekDays();
  const firstDay = days[0].iso;
  const lastDay = days[days.length - 1].iso;
  const currentProfileId = state.session.user.id;

  const { data, error } = await state.supabase
    .from('weekly_reports')
    .select(WEEKLY_REPORT_COLUMNS)
    .eq('profile_id', currentProfileId)
    .gte('work_date', firstDay)
    .lte('work_date', lastDay)
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
  const lunchMinutes = Number(elements.lunchMinutesInput.value || 0);
  const breakMinutes = Number(elements.breakMinutesInput.value || 0);
  const totalMinutes = minutesBetween(
    elements.startTimeInput.value,
    elements.endTimeInput.value,
    lunchMinutes,
    breakMinutes
  );

  return {
    profile_id: state.session.user.id,
    work_date: workDate,
    commission_number: elements.commissionInput.value.trim(),
    start_time: elements.startTimeInput.value,
    end_time: elements.endTimeInput.value,
    lunch_break_minutes: lunchMinutes,
    additional_break_minutes: breakMinutes,
    total_work_minutes: totalMinutes,
    expenses_amount: Number(elements.expensesInput.value || 0),
    other_costs_amount: Number(elements.otherCostsInput.value || 0),
    expense_note: elements.expenseNoteInput.value.trim(),
    notes: elements.notesInput.value.trim()
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
  if (!payload.commission_number) {
    showToast('Kommissionsnummer fehlt.', 'error');
    return;
  }

  if (payload.total_work_minutes <= 0) {
    showToast('Bitte gültige Arbeitszeit eingeben.', 'error');
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
  const reportType = getReportTypeFromCommission(entry?.commission_number || '');

  elements.entryDrawer.classList.remove('hidden');
  elements.entryDrawer.setAttribute('aria-hidden', 'false');
  elements.drawerDateLabel.textContent = formatDate(date);
  elements.drawerTitle.textContent = entry ? 'Rapport bearbeiten' : 'Neuer Eintrag';
  elements.entryIdInput.value = entry?.id || '';
  elements.entryDateInput.value = isoDate;
  elements.reportTypeInput.value = reportType;
  elements.reportTypeInput.dataset.previousValue = reportType;
  elements.commissionInput.value = entry?.commission_number || '';
  elements.startTimeInput.value = entry?.start_time || DEFAULT_START_TIME;
  elements.endTimeInput.value = entry?.end_time || DEFAULT_END_TIME;
  elements.lunchMinutesInput.value = entry?.lunch_break_minutes ?? DEFAULT_LUNCH_MINUTES;
  elements.breakMinutesInput.value = entry?.additional_break_minutes ?? DEFAULT_BREAK_MINUTES;
  elements.expensesInput.value = entry?.expenses_amount ?? 0;
  elements.otherCostsInput.value = entry?.other_costs_amount ?? 0;
  elements.expenseNoteInput.value = entry?.expense_note || '';
  elements.notesInput.value = entry?.notes || '';
  resetAttachmentState('report', entry?.attachments || []);
  elements.deleteEntryBtn.classList.toggle('hidden', !entry);
  renderAttachmentPreview('report');
}

function closeDrawer() {
  state.selectedDate = null;
  state.editingEntry = null;
  elements.entryDrawer.classList.add('hidden');
  elements.entryDrawer.setAttribute('aria-hidden', 'true');
  elements.entryForm.reset();
  elements.reportTypeInput.value = '';
  elements.reportTypeInput.dataset.previousValue = '';
  elements.startTimeInput.value = DEFAULT_START_TIME;
  elements.endTimeInput.value = DEFAULT_END_TIME;
  elements.lunchMinutesInput.value = DEFAULT_LUNCH_MINUTES;
  elements.breakMinutesInput.value = DEFAULT_BREAK_MINUTES;
  resetAttachmentState('report', []);
  renderAttachmentPreview('report');
}

function openHolidayDrawer(holiday = null) {
  state.editingHoliday = holiday;
  elements.holidayDrawer.classList.remove('hidden');
  elements.holidayDrawer.setAttribute('aria-hidden', 'false');
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
    const dayMinutes = dayEntries.reduce((sum, entry) => sum + Number(entry.total_work_minutes || 0), 0);
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
        button.querySelector('.entry-commission').textContent = entry.commission_number;
        button.querySelector('.entry-time-range').textContent = `${entry.start_time} – ${entry.end_time}`;
        button.querySelector('.entry-time').textContent = `${entry.start_time} – ${entry.end_time}`;
        button.querySelector('.entry-minutes').textContent = formatMinutesLong(Number(entry.total_work_minutes || 0));
        button.querySelector('.entry-expenses').textContent = formatCurrency(
          Number(entry.expenses_amount || 0) + Number(entry.other_costs_amount || 0)
        );
        button.querySelector('.entry-notes').textContent = entry.notes || entry.expense_note || 'Keine Bemerkung';
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
    setPill(elements.adminStatusPill, 'Admin: nein', 'neutral');
    elements.isAdminInput.value = '';
    elements.settingsEmailInput.value = '';
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
  elements.signOutBtn.addEventListener('click', signOut);
  elements.settingsForm.addEventListener('submit', saveSettings);
  elements.prevWeekBtn.addEventListener('click', () => handleWeekChange(-1));
  elements.nextWeekBtn.addEventListener('click', () => handleWeekChange(1));
  elements.openHolidayDrawerBtn.addEventListener('click', () => openHolidayDrawer());
  elements.openSettingsViewBtn.addEventListener('click', () => {
    setCurrentView('settings');
  });
  elements.backToDashboardBtn.addEventListener('click', () => {
    setCurrentView('dashboard');
  });
  elements.entryForm.addEventListener('submit', saveEntry);
  elements.holidayForm.addEventListener('submit', saveHolidayRequest);
  elements.deleteEntryBtn.addEventListener('click', deleteEntry);
  elements.deleteHolidayBtn.addEventListener('click', deleteHolidayRequest);
  elements.closeDrawerBtn.addEventListener('click', closeDrawer);
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
  elements.entryForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      elements.startTimeInput.value = DEFAULT_START_TIME;
      elements.endTimeInput.value = DEFAULT_END_TIME;
      elements.lunchMinutesInput.value = DEFAULT_LUNCH_MINUTES;
      elements.breakMinutesInput.value = DEFAULT_BREAK_MINUTES;
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
loadConfig();
