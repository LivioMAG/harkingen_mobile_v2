(function initWeeklyReportImport(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WeeklyReportImport = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function weeklyReportImportFactory() {
  const WEEKDAYS = [
    { key: 'monday', label: 'Montag', shortLabel: 'Mo', offset: 0, aliases: ['mo', 'montag'] },
    { key: 'tuesday', label: 'Dienstag', shortLabel: 'Di', offset: 1, aliases: ['di', 'dienstag'] },
    { key: 'wednesday', label: 'Mittwoch', shortLabel: 'Mi', offset: 2, aliases: ['mi', 'mittwoch'] },
    { key: 'thursday', label: 'Donnerstag', shortLabel: 'Do', offset: 3, aliases: ['do', 'donnerstag'] },
    { key: 'friday', label: 'Freitag', shortLabel: 'Fr', offset: 4, aliases: ['fr', 'freitag'] },
    { key: 'saturday', label: 'Samstag', shortLabel: 'Sa', offset: 5, aliases: ['sa', 'samstag'] }
  ];
  const SPECIAL_ROW_PATTERNS = [
    /wochen\s*total/i,
    /wochentotal/i,
    /unfall/i,
    /abwesenheit/i,
    /ferien/i,
    /krankheit/i,
    /feiertag/i,
    /total\s*absenzen/i
  ];

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function cellText(value) {
    if (value && typeof value === 'object' && 'v' in value) return String(value.v ?? '').trim();
    return String(value ?? '').trim();
  }

  function parseHours(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
    const raw = cellText(value);
    if (!raw) return null;
    const normalized = raw.replace(/'/g, '').replace(/\s+/g, '').replace(',', '.');
    if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) return null;
    const hours = Number(normalized);
    return Number.isFinite(hours) && hours > 0 ? hours : null;
  }

  function parseCommissionNumber(value) {
    const raw = cellText(value).replace(/\.0$/, '').trim();
    if (!raw) return '';
    if (SPECIAL_ROW_PATTERNS.some((pattern) => pattern.test(raw))) return '';
    return raw;
  }

  function isCommissionLike(value) {
    const commission = parseCommissionNumber(value);
    if (!commission) return false;
    return /\d{3,}/.test(commission) || /^[a-z]+\d+/i.test(commission) || /^\d+[a-z]+$/i.test(commission);
  }

  function normalizeHeaderToken(value) {
    return normalizeText(value).replace(/[.:]/g, '').replace(/\s+/g, ' ');
  }

  function isCommissionHeader(value) {
    const token = normalizeHeaderToken(value);
    return /^(kom|komm|kommission|kommissionsnummer|kom nr|komm nr)$/.test(token) || token.includes('kom nr');
  }

  function weekdayForHeader(value) {
    const token = normalizeHeaderToken(value);
    return WEEKDAYS.find((weekday) => weekday.aliases.includes(token)) || null;
  }

  function findHeader(rows) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const commissionColumn = row.findIndex(isCommissionHeader);
      if (commissionColumn < 0) continue;
      const dayColumns = [];
      row.forEach((value, columnIndex) => {
        const weekday = weekdayForHeader(value);
        if (weekday) dayColumns.push({ ...weekday, columnIndex });
      });
      if (dayColumns.length >= 2) {
        return {
          rowIndex,
          commissionColumn,
          projectColumn: Math.max(0, commissionColumn - 1),
          dayColumns
        };
      }
    }
    return null;
  }

  function getIsoWeekStart(year, week) {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4IsoDay = jan4.getUTCDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4IsoDay + 1);
    const monday = new Date(week1Monday);
    monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
    return monday;
  }

  function isoDateFromUtcDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  function parseCalendarWeekFromCells(rows) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        const text = cellText(row[columnIndex]);
        const inlineMatch = text.match(/(?:kalender[-\s]*woche|kw)\D*(\d{1,2})/i);
        if (inlineMatch) return Number(inlineMatch[1]);
        if (/kalender[-\s]*woche|\bkw\b/i.test(text)) {
          for (let lookAhead = 1; lookAhead <= 3; lookAhead += 1) {
            const week = Number(cellText(row[columnIndex + lookAhead]).match(/\d{1,2}/)?.[0]);
            if (Number.isInteger(week) && week >= 1 && week <= 53) return week;
          }
        }
      }
    }
    return null;
  }

  function parseDateRangeMetadata(rows) {
    const dateRangePattern = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/;
    for (const row of rows) {
      for (const value of row || []) {
        const text = cellText(value);
        const match = text.match(dateRangePattern);
        if (!match) continue;
        const startYearRaw = match[3];
        const endYearRaw = match[6];
        const yearRaw = endYearRaw || startYearRaw;
        if (!yearRaw) return { text, year: null };
        const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
        return { text, year: Number.isInteger(year) ? year : null };
      }
    }
    return { text: '', year: null };
  }

  function parseEmployeeName(rows) {
    const titleIndex = rows.findIndex((row) => (row || []).some((value) => /wochenrapport/i.test(cellText(value))));
    const start = titleIndex >= 0 ? titleIndex + 1 : 0;
    for (let rowIndex = start; rowIndex < Math.min(rows.length, start + 8); rowIndex += 1) {
      const row = rows[rowIndex] || [];
      for (const value of row) {
        const text = cellText(value);
        if (!text || /kalender|woche|\d{1,2}\./i.test(text) || /wochenrapport/i.test(text)) continue;
        if (/[a-zäöüéèà]/i.test(text) && text.includes(' ')) return text;
      }
    }
    return '';
  }

  function hasSpecialRowText(row) {
    const joined = (row || []).map(cellText).filter(Boolean).join(' ');
    return SPECIAL_ROW_PATTERNS.some((pattern) => pattern.test(joined));
  }

  function parseRows(rows, options = {}) {
    const header = findHeader(rows);
    const warnings = [];
    if (!header) {
      throw new Error('Keine Header-Zeile mit Kom. Nr. und Wochentagen gefunden.');
    }

    const calendarWeek = Number(options.calendarWeek) || parseCalendarWeekFromCells(rows);
    const dateRange = parseDateRangeMetadata(rows);
    const year = Number(options.year) || dateRange.year || new Date().getFullYear();
    if (!calendarWeek || calendarWeek < 1 || calendarWeek > 53) {
      throw new Error('Keine gültige Kalenderwoche gefunden.');
    }
    const weekStart = getIsoWeekStart(year, calendarWeek);
    const employeeName = options.employeeName || parseEmployeeName(rows);
    const entries = [];
    const knownCommissions = new Set((options.knownCommissions || []).map((item) => String(item).trim()).filter(Boolean));

    for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      if (!row.some((value) => cellText(value))) continue;
      if (hasSpecialRowText(row)) continue;
      const commissionNumber = parseCommissionNumber(row[header.commissionColumn]);
      if (!isCommissionLike(commissionNumber)) continue;
      const projectName = cellText(row[header.projectColumn]);

      header.dayColumns.forEach((dayColumn) => {
        const hours = parseHours(row[dayColumn.columnIndex]);
        if (!hours) return;
        const entryWarnings = [];
        if (knownCommissions.size && !knownCommissions.has(commissionNumber)) {
          entryWarnings.push('Kommissionsnummer ist nicht im Profil gespeichert.');
        }
        entries.push({
          commissionNumber,
          commission_number: commissionNumber,
          projectName,
          project_name: projectName,
          date: isoDateFromUtcDate(addDays(weekStart, dayColumn.offset)),
          work_date: isoDateFromUtcDate(addDays(weekStart, dayColumn.offset)),
          weekday: dayColumn.label,
          weekdayKey: dayColumn.key,
          hours,
          minutes: Math.round(hours * 60),
          status: 'pending',
          employeeName,
          calendarWeek,
          year,
          sourceRow: rowIndex + 1,
          warnings: entryWarnings
        });
      });
    }

    if (!entries.length) {
      throw new Error('Keine gültigen Zeiteinträge gefunden.');
    }

    return {
      employeeName,
      calendarWeek,
      year,
      dateRange: dateRange.text,
      headerRow: header.rowIndex + 1,
      entries,
      warnings
    };
  }

  function parseWorkbook(workbook, options = {}) {
    const XLSX = options.XLSX || (typeof globalThis !== 'undefined' ? globalThis.XLSX : null);
    if (!XLSX?.utils?.sheet_to_json) throw new Error('XLSX-Bibliothek ist nicht verfügbar.');
    const sheetNames = workbook.SheetNames || [];
    for (const sheetName of sheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true });
      try {
        return { ...parseRows(rows, options), sheetName };
      } catch (error) {
        if (!/Header-Zeile|Zeiteinträge/.test(error.message)) throw error;
      }
    }
    throw new Error('Keine lesbare Wochenrapport-Tabelle gefunden.');
  }

  function buildWeeklyReportPayload(entry, profileId) {
    return {
      profile_id: profileId,
      work_date: entry.date || entry.work_date,
      year: entry.year,
      kw: entry.calendarWeek || entry.kw,
      project_name: entry.projectName || entry.project_name || '',
      commission_number: entry.commissionNumber || entry.commission_number,
      start_time: '00:00',
      end_time: '00:00',
      lunch_break_minutes: 0,
      additional_break_minutes: 0,
      total_work_minutes: entry.minutes || Math.round(Number(entry.hours || 0) * 60),
      total_adjusted_work_minutes: entry.minutes || Math.round(Number(entry.hours || 0) * 60),
      expenses_amount: 0,
      other_costs_amount: 0,
      expense_note: null,
      notes: entry.importBatchId || entry.import_batch_id ? `Import Wochenrapport ${entry.importBatchId || entry.import_batch_id}` : null,
      abz_typ: 0,
      attachments: []
    };
  }

  function markDuplicateWarnings(entries, existingEntries = []) {
    const seen = new Set();
    return entries.map((entry) => {
      const key = [entry.commissionNumber, entry.employeeName || '', entry.date, entry.hours].join('|');
      const duplicateInBatch = seen.has(key);
      seen.add(key);
      const duplicateExisting = existingEntries.some((existing) => (
        String(existing.commission_number || '') === String(entry.commissionNumber) &&
        String(existing.work_date || '') === String(entry.date) &&
        Number(existing.total_work_minutes || 0) === Math.round(Number(entry.hours || 0) * 60)
      ));
      const warnings = [...(entry.warnings || [])];
      if (duplicateInBatch) warnings.push('Mögliches Duplikat innerhalb dieses Imports.');
      if (duplicateExisting) warnings.push('Mögliches Duplikat mit bestehendem Zeiteintrag.');
      return { ...entry, warnings };
    });
  }

  return {
    WEEKDAYS,
    buildWeeklyReportPayload,
    getIsoWeekStart,
    markDuplicateWarnings,
    parseHours,
    parseRows,
    parseWorkbook
  };
});
