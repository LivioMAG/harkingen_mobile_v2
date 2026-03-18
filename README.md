# Rapport Mobile

Mobile Web-App für Wochenrapporte von Monteuren mit Supabase Auth, Datenhaltung und Datei-Uploads.

## Dateien

- `index.html` – UI-Struktur der mobilen App.
- `style.css` – modernes Mobile-First-Design.
- `script.js` – Supabase-Anbindung, Auth, Wochenansicht und CRUD-Logik.
- `supabase-config.json` – lokale Projekt-Konfiguration mit Supabase URL + Anon Key.
- `supabase-config.example.json` – Vorlage für die Konfiguration.
- `supabase-schema.sql` – SQL für Tabellen, RLS-Policies und Storage-Bucket.

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

## Lokal starten

Zum Beispiel mit Python:

```bash
python3 -m http.server 4173
```

Dann `http://localhost:4173` öffnen.

## Funktionen

- Login und optional Kontoerstellung per E-Mail/Passwort.
- Aktuelle Kalenderwoche mit Navigation vor/zurück.
- Mehrere Rapporte pro Tag.
- Arbeitszeit von/bis, Mittagspause, zusätzliche Pause.
- Spesen, sonstige Auslagen und Bemerkungen.
- Mehrfach-Upload von Belegen/Fotos direkt in Supabase Storage.
- Bearbeiten und Löschen von vorhandenen Einträgen.
