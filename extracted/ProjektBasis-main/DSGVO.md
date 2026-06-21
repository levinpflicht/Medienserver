# 🔒 DSGVO Checkliste

Kinder-Apps unterliegen Art. 8 DSGVO (erhöhter Schutz).

---

## ✅ Bereits implementiert

- [x] Firebase Region: `europe-west3` (Frankfurt) – Daten bleiben in Deutschland
- [x] Firestore Security Rules – jeder sieht nur eigene Daten
- [x] Storage Rules – Dateizugriff nur für Eigentümer
- [x] Kein Google Analytics
- [x] Kein Tracking, keine Werbung
- [x] HTTPS automatisch (Firebase/Canva)

---

## ⚠️ Noch zu erledigen

- [ ] **Datenschutzerklärung** auf der Website verlinken
  - Empfehlung: [eRecht24 Generator](https://www.e-recht24.de/muster-datenschutzerklaerung.html)
  - Oder: Anwalt beauftragen (~€200 einmalig)

- [ ] **Impressum** (§5 TMG) – Pflicht für alle Websites
  - Vollständiger Name, Adresse, E-Mail

- [ ] **Eltern-Consent** beim Registrieren
  - Checkbox: „Ich stimme der Datenschutzerklärung zu"
  - In `src/app.html` im Registrierungs-Formular ergänzen

- [ ] **Konto-Löschung** für Nutzer ermöglichen
  - Button in Eltern-Dashboard: „Mein Konto löschen"
  - Firebase Auth: `deleteUser()` + Firestore-Daten löschen

---

## 📋 Rechtliche Grundlage

| Thema | Grundlage | Maßnahme |
|---|---|---|
| Kinder unter 16 | Art. 8 DSGVO | Eltern-Consent beim Signup |
| Datenspeicherung | Art. 5 DSGVO | Nur nötige Daten, EU-Server |
| Auskunftsrecht | Art. 15 DSGVO | Export-Funktion anbieten |
| Löschrecht | Art. 17 DSGVO | Konto-Löschung ermöglichen |
| Datenpannen | Art. 33 DSGVO | Firebase meldet automatisch |

---

## 🔑 Firebase-spezifisch

Firebase (Google) ist als Auftragsverarbeiter nach DSGVO zulässig wenn:
1. Region `europe-west3` (Frankfurt) gewählt ✅
2. Datenverarbeitungsvertrag (DPA) mit Google abgeschlossen

**DPA abschließen:**
1. [Google Cloud DPA](https://cloud.google.com/terms/data-processing-addendum) aufrufen
2. Mit Google-Konto akzeptieren
3. Gilt automatisch für Firebase-Projekte in EU-Regionen
