# 🧠 PsyDeeskalation Assist

> Spezialisierter Wärter- & Stationsassistent und interaktiver Deeskalations-Trainer für psychiatrisches Personal mit Cloud SQL Sitzungs-Protokollierung, Firebase Authentifizierung und Clinical API Integrationen.

---

## ✨ Features

| Funktion | Status |
|---|---|
| Sichere Google Authentifizierung (Firebase Auth) | ✅ |
| Stations- & Deeskalations-Trainer (Gemini Multi-Szenario) | ✅ |
| Diagnose-Spezifische Prompt-Konditionierung (ADHS, PTBS, Psychose, Borderline, Autismus) | ✅ |
| Integrierte Deeskalations-Phasen (Prä-Krise, Akute Krise, Nachsorge) | ✅ |
| Krisenerkennung & Oberarzt-Eskalation ("Rote Linie") | ✅ |
| Persistente Sitzungsverwaltung & Verlauf in PostgreSQL (Cloud SQL) | ✅ |
| Freie ICD-10 Diagnosecodes Suche (NIH NLM API) | ✅ |
| Freie OpenFDA Pharmazeutische Daten-Suche (FDA Drug API) | ✅ |
| Freie ClinicalTrials.gov Forschungsstudien-Suche | ✅ |
| Cloud SQL Audit-Protokollierung aller API-Anfragen | ✅ |

---

## 📁 Projektstruktur

```
psydeeskalation-assist/
├── src/
│   ├── components/       # Extrahierbare UI-Komponenten
│   ├── db/               # Drizzle Schema & Cloud SQL Postgres Anbindung
│   ├── lib/              # Firebase- & API-Konfigurationsclients
│   ├── middleware/       # Express Auth-Validierungs-Middleware
│   ├── App.tsx           # Hauptoberfläche des Klinischen Portals
│   ├── index.css         # Globale Tailwind CSS Stile & Fonts
│   └── main.tsx          # React Frontend Entrypoint
├── server.ts             # Express REST API Server & Gemini API Gateway
├── metadata.json         # Anwendungs-Metadaten
├── tsconfig.json         # TypeScript Konfiguration
├── vite.config.ts        # Vite Build Tool Konfiguration
└── package.json          # Node.js Abhängigkeiten & Skripte
```

---

## 🔧 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Motion (Framer Motion)
- **Backend**: Node.js Express Server (mit nativem TypeScript-Support)
- **Datenbank**: Google Cloud SQL (PostgreSQL) via Drizzle ORM
- **Authentifizierung**: Firebase authentication (Google OAuth Popup-Flow)
- **KI-Modelle**: Google Gemini-Modelle (`gemini-3.5-flash`) via GoogleGenAI SDK (`@google/genai`)

---

## 🔒 Sicherheit & Sicherheitsgrenzen

- **Rolle**: Fachassistent für Stationsmitglieder zur Schulung & Deeskalationstraining. **Kein Ersatz für klinische Entscheidungen!**
- **Kriseneskalation**: Triggert ein internes Erkennungsprotokoll bei Gefährdungslagen, welches das Hinzuziehen des Diensthabenden Oberarztes fordert ("sofort OA informieren").
- **Datenschutz**: Keine Speicherung von echten, identifizierbaren Patientendaten. Alle API-Filter laufen gesichert serverseitig.

