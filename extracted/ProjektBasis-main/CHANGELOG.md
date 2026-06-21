# Changelog

## [1.0.0] - 2025-06-21

### Hinzugefügt
- Eltern-Login mit E-Mail und Passwort (Firebase Auth)
- Mehrere Kinder-Profile mit Emoji, Farbe und PIN
- Tagesplan mit Zeitblöcken, Emoji, Beschreibung
- Aufgaben-System mit Punkten
- Foto- und Video-Upload (Firebase Storage)
- Kindgerechter Bereich mit großer UI
- PIN-Schutz zum Verlassen des Kinderbereichs
- Fortschrittsanzeige im Kinderbereich
- Demo-Modus (localStorage, kein Firebase nötig)
- DSGVO-konformes Hosting in Frankfurt (europe-west3)

### Technisch
- Einzel-Datei-Architektur (eine HTML-Datei, keine Dependencies)
- Firebase SDK v10 via CDN (kein Build-Schritt)
- Firestore Security Rules (Datentrennung pro User)
- Storage Security Rules (Dateizugriff nur für Eigentümer)
