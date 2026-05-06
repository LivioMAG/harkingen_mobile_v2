# Rapport Mobile

Mobile Web-App für Wochenrapporte von Monteuren mit Supabase Auth, Datenhaltung und Datei-Uploads.

## Dateien

- `index.html` – UI-Struktur der mobilen App mit Login/Registrierung, Wochenrapport und Ferien-/Absenzanträgen.
- `style.css` – Mobile-First-Design im Firmenstil mit roter Highlight-Farbe, weissem Hintergrund und schwarzer Schrift.
- `script.js` – Supabase-Anbindung, Auth, Wochenansicht sowie CRUD-Logik für Rapporte und Abwesenheiten.
- `supabase-config.json` – lokale Projekt-Konfiguration mit Supabase URL + Anon Key.
- `supabase-config.example.json` – Vorlage für die Konfiguration.
- `supabase-schema.sql` – SQL für Tabellen, RLS-Policies und Storage-Bucket.
- `surcharge-rules.json` – Zuschlagsregeln (Zeitfenster + Multiplikator) für die Berechnung der angepassten Arbeitszeit.

## Supabase einrichten

1. In Supabase ein neues Projekt anlegen.
2. Im SQL Editor den Inhalt aus `supabase-schema.sql` ausführen.
3. In `supabase-config.json` diese Werte eintragen:

```json
{
  "supabaseUrl": "https://DEIN-PROJEKT.supabase.co",
  "supabaseAnonKey": "DEIN_SUPABASE_ANON_KEY",
  "projectName": "rapport-mobile"
}
```

4. E-Mail/Passwort-Login in Supabase Auth aktivieren.
5. Die App lokal z. B. mit einem statischen Server starten.
6. Bei bestehenden Projekten das aktuelle SQL aus `supabase-schema.sql` erneut im Supabase SQL Editor ausführen, damit die optimierten RLS-/Admin-Funktionen übernommen werden.

## Lokal starten

Zum Beispiel mit Python:

```bash
python3 -m http.server 4173
```

Dann `http://localhost:4173` öffnen.

## Funktionen

- Getrennte Login- und Registrierungsmaske per E-Mail/Passwort.
- Aktuelle Kalenderwoche mit Navigation vor/zurück.
- Mehrere Rapporte pro Tag.
- Standard-Arbeitszeit von 07:00 bis 17:30 Uhr mit 60 Minuten Mittagspause und 30 Minuten zusätzlicher Pause.
- Zuschlagsberechnung je Wochentag/Zeitfenster aus `surcharge-rules.json` mit separater Speicherung in `weekly_reports.total_adjusted_work_minutes`.
- Feiertagsrapport (`feiertag`) unterstützt bezahlte/unbezahlte Feiertage aus der Tabelle `Platform Holiday` (`is_underlined_paid`) mit konfigurierbaren Multiplikatoren in `surcharge-rules.json`.
- Spesen, sonstige Auslagen und Bemerkungen.
- Mehrfach-Upload von Belegen/Fotos direkt in Supabase Storage.
- Ferien- und Absenzanträge mit Typwahl (Ferien, Militär, Zivildienst, Unfall, Krankheit) inklusive Anhängen.
- Bearbeiten und Löschen von vorhandenen Rapporten und Abwesenheitsanträgen.

## PWA-Update-Strategie

- Service Worker: `sw.js` mit versionierten Caches (`static-*`, `runtime-*`).
- Bei neuer Version wird per `skipWaiting()` + `clients.claim()` sofort übernommen.
- App registriert den SW mit `updateViaCache: 'none'` und prüft jede Minute auf Updates.
- Bei neuem SW zeigt die App kurz „Neue Version verfügbar – App wird aktualisiert.“ und lädt danach automatisch neu.
- `index.html`, `manifest.webmanifest` und `sw.js` sollten mit `Cache-Control: no-cache` ausgeliefert werden.
- Versionierte Assets (hier über `?v=...`) dürfen lange gecacht werden (`immutable`).
- Beispiel-Header für Netlify (`_headers`) und Vercel (`vercel.json`) sind enthalten.
