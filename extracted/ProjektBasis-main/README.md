# 🏠 FamilySpace

> Familien-App für Kinder-Tagesplan, Aufgaben und Medien – kostenlos, sicher, datenschutzkonform.

[![Deploy to Firebase](https://img.shields.io/badge/Deploy-Firebase-orange?logo=firebase)](https://console.firebase.google.com)
[![Canva Code](https://img.shields.io/badge/Hosted-Canva%20Code-7B2FBE)](https://www.canva.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

| Funktion | Status |
|---|---|
| Eltern-Login (E-Mail + Passwort) | ✅ |
| Mehrere Kinder-Profile | ✅ |
| Tagesplan mit Zeitblöcken | ✅ |
| Aufgaben mit Punkten | ✅ |
| Foto/Video-Upload | ✅ |
| Kindgerechter Bereich | ✅ |
| PIN-Schutz zum Verlassen | ✅ |
| Echtzeit-Sync (Firebase) | ✅ |
| Demo-Modus (kein Firebase nötig) | ✅ |
| DSGVO-konform (Frankfurt) | ✅ |

---

## 🚀 Schnellstart

### Demo-Modus (sofort, kein Account nötig)
1. `src/app.html` in [Canva Code](https://www.canva.com) einfügen
2. `DEMO_MODE: true` lassen
3. Veröffentlichen → fertig

### Mit Firebase (empfohlen)
1. [Firebase Projekt anlegen](docs/FIREBASE_SETUP.md)
2. Config in `src/app.html` eintragen
3. `DEMO_MODE: false` setzen
4. In Canva Code neu veröffentlichen

---

## 📁 Projektstruktur

```
familyspace/
├── src/
│   └── app.html          # Die komplette App (eine Datei)
├── docs/
│   ├── FIREBASE_SETUP.md # Firebase Schritt-für-Schritt
│   ├── CANVA_DEPLOY.md   # Canva Code Deployment
│   ├── DSGVO.md          # Datenschutz-Checkliste
│   └── ARCHITECTURE.md   # Technische Architektur
├── .github/
│   └── workflows/
│       └── validate.yml  # Automatische HTML-Prüfung
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## 🔧 Tech Stack

| Layer | Technologie | Kosten |
|---|---|---|
| Frontend | HTML + CSS + JS (vanilla) | €0 |
| Auth | Firebase Authentication | €0 |
| Datenbank | Firebase Firestore | €0 |
| Storage | Firebase Storage | €0 |
| Hosting | Canva Code | €0 |
| **Gesamt** | | **€0/Monat** |

---

## 🔒 Sicherheit & DSGVO

- Firebase Region: `europe-west3` (Frankfurt)
- Firestore Security Rules: Jeder sieht nur eigene Daten
- Storage Rules: Datei-Zugriff nur für den eigenen User
- Kein Tracking, kein Analytics
- Kinder-Daten nie öffentlich zugänglich

---

## 📖 Dokumentation

- [Firebase Setup](docs/FIREBASE_SETUP.md)
- [Canva Deployment](docs/CANVA_DEPLOY.md)
- [DSGVO Checkliste](docs/DSGVO.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)

---

## 🗺️ Roadmap

- [x] v1.0 – MVP: Login, Kinder, Tagesplan, Medien
- [ ] v1.1 – Zweiter Elternteil (Co-Parent Sharing)
- [ ] v1.2 – Punkte-System / Gamification
- [ ] v1.3 – Push-Benachrichtigungen
- [ ] v2.0 – Native App (iOS/Android via Capacitor)

---

## 📄 Lizenz

MIT License – siehe [LICENSE](LICENSE)
