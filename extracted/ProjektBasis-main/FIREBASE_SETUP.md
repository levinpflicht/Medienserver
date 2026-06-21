# 🔥 Firebase Setup Guide

Vollständige Anleitung zum Einrichten von Firebase für FamilySpace.
**Dauer: ca. 30–45 Minuten. Kosten: €0**

---

## Voraussetzungen

- Google-Konto (kostenlos)
- Canva-Konto (kostenlos)

---

## Schritt 1: Firebase-Projekt anlegen

1. Gehe zu [console.firebase.google.com](https://console.firebase.google.com)
2. Klicke auf **„Projekt erstellen"**
3. Projektname: `familyspace` (oder eigener Name)
4. **Google Analytics: DEAKTIVIEREN** (nicht nötig, besser für DSGVO)
5. **„Projekt erstellen"** klicken → 30–60 Sekunden warten

---

## Schritt 2: Web-App registrieren

1. Im Dashboard auf das **Web-Symbol `</>`** klicken
2. App-Nickname: `familyspace-web`
3. Firebase Hosting **NICHT** aktivieren (wir nutzen Canva)
4. **„App registrieren"** klicken
5. Den **`firebaseConfig`-Block kopieren und sicher speichern!**

```javascript
// Sieht ungefähr so aus – deine echten Werte eintragen:
const firebaseConfig = {
  apiKey:            "AIzaSyB...",
  authDomain:        "familyspace-xxx.firebaseapp.com",
  projectId:         "familyspace-xxx",
  storageBucket:     "familyspace-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123"
};
```

---

## Schritt 3: Authentication aktivieren

1. Menü links: **Build → Authentication**
2. **„Jetzt starten"** → Tab **„Sign-in method"**
3. **„E-Mail/Passwort"** klicken → Ersten Toggle **aktivieren** → **„Speichern"**
4. Tab **„Settings"** → **„Authorized domains"** → hinzufügen:
   ```
   *.my.canva.site
   ```

> ⚠️ Ohne Schritt 4 blockiert Firebase den Login von Canva aus!

---

## Schritt 4: Firestore Datenbank

1. Menü: **Build → Firestore Database → „Datenbank erstellen"**
2. **„Im Produktionsmodus starten"** → **„Weiter"**
3. Region: **`europe-west3`** (Frankfurt – DSGVO!) → **„Aktivieren"**

### Sicherheitsregeln setzen

Tab **„Regeln"** → alles ersetzen → **„Veröffentlichen"**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Jeder Elternteil sieht NUR seine eigenen Daten
    match /users/{userId}/{document=**} {
      allow read, write:
        if request.auth != null
        && request.auth.uid == userId;
    }

    // Alles andere blockieren
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Schritt 5: Storage für Fotos

1. Menü: **Build → Storage → „Jetzt starten"**
2. Produktionsmodus → Region **`europe-west3`** → **„Fertig"**

### Storage-Regeln setzen

Tab **„Regeln"** → alles ersetzen → **„Veröffentlichen"**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Nur eigene Dateien lesen/schreiben
    match /users/{userId}/{allPaths=**} {
      allow read, write:
        if request.auth != null
        && request.auth.uid == userId;
    }

    // Rest blockieren
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Schritt 6: Config in App eintragen

In `src/app.html` diese zwei Stellen ändern:

```javascript
// 1. Deine Firebase-Config eintragen:
const firebaseConfig = {
  apiKey:            "DEIN_ECHTER_KEY",
  authDomain:        "dein-projekt.firebaseapp.com",
  projectId:         "dein-projekt",
  storageBucket:     "dein-projekt.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc"
};

// 2. Demo-Modus deaktivieren:
const DEMO_MODE = false;  // ← true → false
```

---

## Schritt 7: Testen

1. App in Canva neu veröffentlichen
2. Eltern-Konto registrieren
3. In Firebase Console → Authentication → Users → User erscheint ✅
4. Kind anlegen → Firestore → Daten erscheinen ✅
5. Bild hochladen → Storage → Datei erscheint ✅
6. Auf zweitem Gerät einloggen → Daten synchron ✅

---

## Fehlerbehebung

| Fehler | Lösung |
|---|---|
| `auth/unauthorized-domain` | Authorized domains → `*.my.canva.site` hinzufügen |
| `Missing or insufficient permissions` | Firestore-Regeln neu veröffentlichen |
| Upload schlägt fehl | Storage-Regeln prüfen, Auth-Domain prüfen |
| Demo-Banner erscheint noch | `DEMO_MODE = false` setzen |

---

## Nächste Schritte

- [Canva Deployment](CANVA_DEPLOY.md)
- [DSGVO Checkliste](DSGVO.md)
