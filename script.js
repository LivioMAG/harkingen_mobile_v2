const CONFIG_PATH = './supabase-config.json';
const STORAGE_BUCKET = 'weekly-attachments';
const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const state = {
  config: null,
  supabase: null,
  session: null,
  profile: null,
  weekOffset: 0,
  entries: [],
  selectedDate: null,
  editingEntry: null,
  toastTimer: null
};

const elements = {
  configStatusPill: document.getElementById('configStatusPill'),
  authStatusPill: document.getElementById('authStatusPill'),
  signOutBtn: document.getElementById('signOutBtn'),
  authCard: document.getElementById('authCard'),
  appView: document.getElementById('appView'),
  authForm: document.getElementById('authForm'),
  signUpBtn: document.getElementById('signUpBtn'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  fullNameInput: document.getElementById('fullNameInput'),
  welcomeHeading: document.getElementById('welcomeHeading'),
  weekRangeLabel: document.getElementById('weekRangeLabel'),
  weekGrid: document.getElementById('weekGrid'),
  weekEntryCount: document.getElementById('weekEntryCount'),
  weekMinutesTotal: document.getElementById('weekMinutesTotal'),
  weekExpensesTotal: document.getElementById('weekExpensesTotal'),
  prevWeekBtn: document.getElementById('prevWeekBtn'),
  nextWeekBtn: document.getElementById('nextWeekBtn'),
  todayWeekBtn: document.getElementById('todayWeekBtn'),
  entryDrawer: document.getElementById('entryDrawer'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  drawerTitle: document.getElementById('drawerTitle'),
  drawerDateLabel: document.getElementById('drawerDateLabel'),
  entryForm: document.getElementById('entryForm'),
  entryIdInput: document.getElementById('entryIdInput'),
  entryDateInput: document.getElementById('entryDateInput'),
  commissionInput: document.getElementById('commissionInput'),
  startTimeInput: document.getElementById('startTimeInput'),
  endTimeInput: document.getElementById('endTimeInput'),
  lunchMinutesInput: document.getElementById('lunchMinutesInput'),
  breakMinutesInput: document.getElementById('breakMinutesInput'),
  expensesInput: document.getElementById('expensesInput'),
  otherCostsInput: document.getElementById('otherCostsInput'),
  expenseNoteInput: document.getElementById('expenseNoteInput'),
  notesInput: document.getElementById('notesInput'),
  attachmentsInput: document.getElementById('attachmentsInput'),
  existingAttachmentsBlock: document.getElementById('existingAttachmentsBlock'),
  existingAttachmentsList: document.getElementById('existingAttachmentsList'),
  attachmentCountLabel: document.getElementById('attachmentCountLabel'),
  deleteEntryBtn: document.getElementById('deleteEntryBtn'),
  dayCardTemplate: document.getElementById('dayCardTemplate'),
  entryCardTemplate: document.getElementById('entryCardTemplate')
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

function setPill(element, text, variant) {
  element.className = `pill ${variant}`;
  element.textContent = text;
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
  return date.toISOString().slice(0, 10);
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
  const raw = end - start;
  return Math.max(0, raw - Number(lunchMinutes || 0) - Number(breakMinutes || 0));
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
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

async function loadConfig() {
  try {
    const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Konfigurationsdatei nicht gefunden.');
    }

    const config = await response.json();
    state.config = config;

    if (!validateConfig(config)) {
      setPill(elements.configStatusPill, 'Konfiguration unvollständig', 'warning');
      showToast('Bitte supabase-config.json mit URL und Anon Key ergänzen.', 'error');
      return;
    }

    state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    setPill(elements.configStatusPill, 'Supabase verbunden', 'success');
    wireAuthListener();
    await bootstrapSession();
  } catch (error) {
    console.error(error);
    setPill(elements.configStatusPill, 'Konfiguration fehlt', 'danger');
    showToast('supabase-config.json konnte nicht geladen werden.', 'error');
  }
}

function wireAuthListener() {
  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session?.user) {
      await ensureProfile(session.user);
      await loadEntries();
    } else {
      state.profile = null;
      state.entries = [];
    }
    render();
  });
}

async function bootstrapSession() {
  const { data, error } = await state.supabase.auth.getSession();
  if (error) {
    showToast(error.message, 'error');
    return;
  }

  state.session = data.session;
  if (state.session?.user) {
    await ensureProfile(state.session.user);
    await loadEntries();
  }
  render();
}

async function ensureProfile(user, explicitFullName) {
  const fallbackName = explicitFullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Monteur';
  const payload = {
    id: user.id,
    email: user.email,
    full_name: fallbackName,
    role_label: 'Monteur'
  };

  const { data, error } = await state.supabase
    .from('app_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    showToast(`Profil konnte nicht gespeichert werden: ${error.message}`, 'error');
    return;
  }

  state.profile = data;
}

async function signIn(event) {
  event.preventDefault();
  if (!state.supabase) {
    showToast('Bitte zuerst Supabase konfigurieren.', 'error');
    return;
  }

  const email = elements.emailInput.value.trim();
  const password = elements.passwordInput.value;

  const { error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showToast(`Anmeldung fehlgeschlagen: ${error.message}`, 'error');
    return;
  }

  showToast('Erfolgreich angemeldet.');
  elements.authForm.reset();
}

async function signUp() {
  if (!state.supabase) {
    showToast('Bitte zuerst Supabase konfigurieren.', 'error');
    return;
  }

  const email = elements.emailInput.value.trim();
  const password = elements.passwordInput.value;
  const fullName = elements.fullNameInput.value.trim();

  if (!email || !password) {
    showToast('E-Mail und Passwort sind erforderlich.', 'error');
    return;
  }

  const { data, error } = await state.supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split('@')[0] }
    }
  });

  if (error) {
    showToast(`Konto konnte nicht erstellt werden: ${error.message}`, 'error');
    return;
  }

  if (data.session?.user) {
    await ensureProfile(data.session.user, fullName);
  }

  showToast('Konto erstellt. Bitte E-Mail-Bestätigung prüfen, falls aktiviert.');
}

async function signOut() {
  const { error } = await state.supabase.auth.signOut();
  if (error) {
    showToast(`Abmeldung fehlgeschlagen: ${error.message}`, 'error');
    return;
  }
  showToast('Erfolgreich abgemeldet.');
}

async function loadEntries() {
  if (!state.session?.user) return;
  const days = getWeekDays();
  const firstDay = days[0].iso;
  const lastDay = days[days.length - 1].iso;

  const { data, error } = await state.supabase
    .from('weekly_reports')
    .select('*')
    .gte('work_date', firstDay)
    .lte('work_date', lastDay)
    .order('work_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    showToast(`Rapporte konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  state.entries = data || [];
}

function getEntriesForDate(isoDate) {
  return state.entries.filter((entry) => entry.work_date === isoDate);
}

function buildStoragePath(file, isoDate) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return `${state.session.user.id}/${isoDate}/${Date.now()}-${safeName}`;
}

async function uploadAttachments(files, isoDate, existingFiles = []) {
  if (!files.length) return existingFiles;

  const uploaded = [...existingFiles];

  for (const file of files) {
    const filePath = buildStoragePath(file, isoDate);
    const { error } = await state.supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: false });
    if (error) {
      throw error;
    }

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
    const existingAttachments = state.editingEntry?.attachments || [];
    const attachments = await uploadAttachments(Array.from(elements.attachmentsInput.files || []), payload.work_date, existingAttachments);
    const body = { ...payload, attachments };

    let result;
    if (state.editingEntry?.id) {
      result = await state.supabase
        .from('weekly_reports')
        .update(body)
        .eq('id', state.editingEntry.id)
        .select()
        .single();
    } else {
      result = await state.supabase.from('weekly_reports').insert(body).select().single();
    }

    if (result.error) {
      throw result.error;
    }

    showToast(state.editingEntry?.id ? 'Eintrag aktualisiert.' : 'Eintrag gespeichert.');
    closeDrawer();
    await loadEntries();
    renderWeek();
  } catch (error) {
    console.error(error);
    showToast(`Speichern fehlgeschlagen: ${error.message}`, 'error');
  }
}

async function deleteEntry() {
  if (!state.editingEntry?.id) return;
  const confirmed = window.confirm('Diesen Rapport wirklich löschen?');
  if (!confirmed) return;

  const { error } = await state.supabase.from('weekly_reports').delete().eq('id', state.editingEntry.id);
  if (error) {
    showToast(`Löschen fehlgeschlagen: ${error.message}`, 'error');
    return;
  }

  showToast('Eintrag gelöscht.');
  closeDrawer();
  await loadEntries();
  renderWeek();
}

function openDrawer(isoDate, entry = null) {
  state.selectedDate = isoDate;
  state.editingEntry = entry;
  const date = parseLocalDate(isoDate);

  elements.entryDrawer.classList.remove('hidden');
  elements.entryDrawer.setAttribute('aria-hidden', 'false');
  elements.drawerDateLabel.textContent = formatDate(date);
  elements.drawerTitle.textContent = entry ? 'Rapport bearbeiten' : 'Neuer Eintrag';
  elements.entryIdInput.value = entry?.id || '';
  elements.entryDateInput.value = isoDate;
  elements.commissionInput.value = entry?.commission_number || '';
  elements.startTimeInput.value = entry?.start_time || '07:30';
  elements.endTimeInput.value = entry?.end_time || '17:00';
  elements.lunchMinutesInput.value = entry?.lunch_break_minutes ?? 30;
  elements.breakMinutesInput.value = entry?.additional_break_minutes ?? 0;
  elements.expensesInput.value = entry?.expenses_amount ?? 0;
  elements.otherCostsInput.value = entry?.other_costs_amount ?? 0;
  elements.expenseNoteInput.value = entry?.expense_note || '';
  elements.notesInput.value = entry?.notes || '';
  elements.attachmentsInput.value = '';
  elements.deleteEntryBtn.classList.toggle('hidden', !entry);
  renderAttachmentPreview(entry?.attachments || []);
}

function closeDrawer() {
  state.selectedDate = null;
  state.editingEntry = null;
  elements.entryDrawer.classList.add('hidden');
  elements.entryDrawer.setAttribute('aria-hidden', 'true');
  elements.entryForm.reset();
  renderAttachmentPreview([]);
}

function renderAttachmentPreview(attachments) {
  const files = attachments || [];
  elements.existingAttachmentsBlock.classList.toggle('hidden', files.length === 0);
  elements.attachmentCountLabel.textContent = `${files.length} Datei${files.length === 1 ? '' : 'en'}`;
  elements.existingAttachmentsList.innerHTML = '';

  files.forEach((file) => {
    const link = document.createElement('a');
    link.className = 'file-chip';
    link.href = file.publicUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.innerHTML = `<span>📎</span><span>${file.name}</span>`;
    elements.existingAttachmentsList.appendChild(link);
  });
}

function renderWeek() {
  const days = getWeekDays();
  const weekNumber = getWeekNumber(days[0].date);
  elements.weekRangeLabel.textContent = `KW ${weekNumber} · ${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}`;

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

    const addEntryBtn = fragment.querySelector('.add-entry-btn');
    addEntryBtn.addEventListener('click', () => openDrawer(day.iso));

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
        button.querySelector('.entry-time').textContent = `${entry.start_time} – ${entry.end_time}`;
        button.querySelector('.entry-minutes').textContent = formatMinutes(Number(entry.total_work_minutes || 0));
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

  elements.weekEntryCount.textContent = String(totalEntries);
  elements.weekMinutesTotal.textContent = formatMinutes(totalMinutes);
  elements.weekExpensesTotal.textContent = formatCurrency(totalExpenses);
}

function render() {
  const isAuthenticated = Boolean(state.session?.user);
  elements.authCard.classList.toggle('hidden', isAuthenticated);
  elements.appView.classList.toggle('hidden', !isAuthenticated);
  elements.signOutBtn.classList.toggle('hidden', !isAuthenticated);

  if (isAuthenticated) {
    setPill(elements.authStatusPill, `Angemeldet als ${state.session.user.email}`, 'success');
    elements.welcomeHeading.textContent = `Hallo ${state.profile?.full_name || state.session.user.email}`;
    renderWeek();
  } else {
    setPill(elements.authStatusPill, 'Nicht angemeldet', 'neutral');
    elements.weekGrid.innerHTML = '';
  }
}

function handleWeekChange(offsetDelta) {
  state.weekOffset += offsetDelta;
  if (!state.session?.user) return;

  loadEntries().then(() => renderWeek());
}

function jumpToCurrentWeek() {
  state.weekOffset = 0;
  if (!state.session?.user) return;
  loadEntries().then(() => renderWeek());
}

function registerEventListeners() {
  elements.authForm.addEventListener('submit', signIn);
  elements.signUpBtn.addEventListener('click', signUp);
  elements.signOutBtn.addEventListener('click', signOut);
  elements.prevWeekBtn.addEventListener('click', () => handleWeekChange(-1));
  elements.nextWeekBtn.addEventListener('click', () => handleWeekChange(1));
  elements.todayWeekBtn.addEventListener('click', jumpToCurrentWeek);
  elements.entryForm.addEventListener('submit', saveEntry);
  elements.deleteEntryBtn.addEventListener('click', deleteEntry);
  elements.closeDrawerBtn.addEventListener('click', closeDrawer);
  elements.entryDrawer.addEventListener('click', (event) => {
    if (event.target.dataset.closeDrawer === 'true') {
      closeDrawer();
    }
  });
}

registerEventListeners();
loadConfig();
