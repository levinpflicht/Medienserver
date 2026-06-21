# 🏗️ Technische Architektur

---

## Überblick

```
┌─────────────────────────────────────────┐
│            Canva Code (Hosting)          │
│  ┌───────────────────────────────────┐  │
│  │         src/app.html              │  │
│  │   HTML + CSS + JS (eine Datei)    │  │
│  │                                   │  │
│  │  ┌─────────┐   ┌──────────────┐  │  │
│  │  │ Eltern- │   │  Kinder-     │  │  │
│  │  │ Bereich │   │  Bereich     │  │  │
│  │  └────┬────┘   └──────┬───────┘  │  │
│  └───────┼───────────────┼──────────┘  │
└──────────┼───────────────┼─────────────┘
           │  Firebase SDK (CDN)          
           ▼                              
┌─────────────────────────────────────────┐
│         Google Firebase                  │
│         Region: europe-west3 (Frankfurt) │
│                                          │
│  ┌─────────┐ ┌───────────┐ ┌─────────┐ │
│  │  Auth   │ │ Firestore │ │ Storage │ │
│  │ Login   │ │ DB + Sync │ │ Medien  │ │
│  └─────────┘ └───────────┘ └─────────┘ │
└─────────────────────────────────────────┘
```

---

## Datenbankstruktur (Firestore)

```
/users/{userId}                    ← Elternteil
  /kinder/{kindId}                 ← Kind-Profil
    - name, emoji, farbe, pin
    /tagesplan/{datum}/eintraege/{id}
      - titel, emoji, zeitVon, zeitBis
      - beschreibung, erledigt
    /aufgaben/{id}
      - titel, emoji, punkte, erledigt
    /medien/{id}
      - url, name, typ, storagePath
```

---

## Sicherheitsmodell

```
Firestore Rule:
  /users/{userId}/** → nur auth.uid == userId

Storage Rule:
  /users/{userId}/** → nur auth.uid == userId
```

→ Kein Cross-User-Zugriff möglich.

---

## Demo-Modus vs. Firebase

| | Demo-Modus | Firebase |
|---|---|---|
| Datenspeicherung | localStorage | Firestore |
| Auth | btoa() Hash | Firebase Auth |
| Upload | Base64 DataURL | Firebase Storage |
| Sync | ❌ | ✅ Echtzeit |
| Geräteübergreifend | ❌ | ✅ |
| Persistenz | Browser-Cache | Dauerhaft |

---

## Native App (zukünftig)

Mit [Capacitor.js](https://capacitorjs.com) kann `src/app.html` als native App verpackt werden:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init FamilySpace com.familyspace.app
npx cap add android
npx cap add ios
npx cap copy
npx cap open android   # Android Studio
npx cap open ios       # Xcode
```

**Dann möglich:**
- Echter Kiosk-Modus (Android LockTask API)
- Push-Benachrichtigungen
- Offline-Caching (Service Worker)
- App Store Veröffentlichung
