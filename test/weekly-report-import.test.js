const test = require('node:test');
const assert = require('node:assert/strict');
const Import = require('../weekly-report-import.js');

function sampleRows() {
  return [
    ['Wochenrapport'],
    [],
    [],
    [],
    [],
    ['Livio Emmenegger', '', '', '2.2.2026 - 5.2.2026', '', '', '', '', '', '', '', '', '', 'Kalender-Woche:', '', '6'],
    [],
    ['Projekt/Beschreibung', 'Kom. Nr.', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'Total', '', 'Spesen', 'Auto', 'Mofa', 'Bemerkungen'],
    ['Projekt A', '17006119', '', 2, '', '', '2', '', 4, '', '', '', '', ''],
    ['Projekt B', '17007378', '8,5', 6, 8, '8', 3, '', 33.5, '', 90, '', '', 'Spese nicht importieren'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Projekt C', '17007412', '', '', '', '', 2.5, '', 2.5, '', '', '', '', ''],
    ['Wochentotal', '', 8.5, 8, 8, 8, 7.5, '', 40, '', 90, '', '', ''],
    ['Ferien', '999999', 8, '', '', '', '', '', 8]
  ];
}


test('parseWorkbook liest ein XLSX-Workbook über den ersten passenden Sheet', () => {
  const workbook = { SheetNames: ['Livio'], Sheets: { Livio: { rows: sampleRows() } } };
  const XLSX = { utils: { sheet_to_json: (sheet) => sheet.rows } };
  const result = Import.parseWorkbook(workbook, { XLSX });
  assert.equal(result.sheetName, 'Livio');
  assert.equal(result.entries.length, 8);
});

test('XLSX-Beispielstruktur wird als Zeiteinträge gelesen und Nicht-Zeitspalten werden ignoriert', () => {
  const result = Import.parseRows(sampleRows(), { knownCommissions: ['17006119', '17007378', '17007412'] });
  assert.equal(result.employeeName, 'Livio Emmenegger');
  assert.equal(result.calendarWeek, 6);
  assert.equal(result.year, 2026);
  assert.equal(result.entries.length, 8);
  assert.deepEqual(result.entries.map((entry) => [entry.commissionNumber, entry.weekday, entry.hours]), [
    ['17006119', 'Dienstag', 2],
    ['17006119', 'Freitag', 2],
    ['17007378', 'Montag', 8.5],
    ['17007378', 'Dienstag', 6],
    ['17007378', 'Mittwoch', 8],
    ['17007378', 'Donnerstag', 8],
    ['17007378', 'Freitag', 3],
    ['17007412', 'Freitag', 2.5]
  ]);
  assert(!result.entries.some((entry) => entry.hours === 90), 'Spesen-Spalte darf nicht importiert werden');
  assert(!result.entries.some((entry) => entry.hours === 33.5 || entry.hours === 40), 'Total-Spalte/-Zeile darf nicht importiert werden');
  assert(!result.entries.some((entry) => entry.commissionNumber === '999999'), 'Spezialzeilen werden ignoriert');
});

test('Dezimalstunden mit Punkt, Komma, Integer und Strings werden erkannt', () => {
  assert.equal(Import.parseHours('8.5'), 8.5);
  assert.equal(Import.parseHours('8,5'), 8.5);
  assert.equal(Import.parseHours(8.5), 8.5);
  assert.equal(Import.parseHours('8'), 8);
  assert.equal(Import.parseHours(''), null);
  assert.equal(Import.parseHours('abc'), null);
});

test('KW und Jahr werden zu echten ISO-Daten gemappt', () => {
  const result = Import.parseRows(sampleRows());
  const monday = result.entries.find((entry) => entry.weekday === 'Montag');
  const friday = result.entries.find((entry) => entry.commissionNumber === '17007412');
  assert.equal(monday.date, '2026-02-02');
  assert.equal(friday.date, '2026-02-06');
});

test('Unbekannte Kommissionsnummer erzeugt Warnung statt Hard-Fail', () => {
  const result = Import.parseRows(sampleRows(), { knownCommissions: ['17006119'] });
  const unknown = result.entries.find((entry) => entry.commissionNumber === '17007378');
  assert(unknown.warnings.includes('Kommissionsnummer ist nicht im Profil gespeichert.'));
});

test('Einzelbestätigung und alle bestätigen erzeugen Payloads nur für bestätigte Einträge', () => {
  const result = Import.parseRows(sampleRows());
  const [first, ...rest] = result.entries.map((entry, index) => ({ ...entry, id: String(index), importBatchId: 'batch-1' }));
  const singlePayload = Import.buildWeeklyReportPayload(first, 'profile-1');
  assert.equal(singlePayload.commission_number, '17006119');
  assert.equal(singlePayload.work_date, '2026-02-03');
  assert.equal(singlePayload.total_work_minutes, 120);
  assert.equal(singlePayload.expenses_amount, 0);
  assert.equal(singlePayload.other_costs_amount, 0);

  const rejected = rest[0];
  rejected.status = 'rejected';
  const confirmedPayloads = [first, ...rest]
    .filter((entry) => entry.status !== 'rejected')
    .map((entry) => Import.buildWeeklyReportPayload(entry, 'profile-1'));
  assert.equal(confirmedPayloads.length, 7);
  assert(!confirmedPayloads.some((payload) => payload.commission_number === rejected.commissionNumber && payload.work_date === rejected.date));
});
