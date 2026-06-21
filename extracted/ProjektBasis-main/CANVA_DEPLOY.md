# 🎨 Canva Code – Deployment Guide

---

## Erstmalig deployen

1. [canva.com](https://canva.com) öffnen → **„Design erstellen"**
2. Suche: **„Website"** → Website-Format wählen
3. Links: **Apps** → **„Code"** suchen → **„Canva Code"** hinzufügen
4. Den gesamten Inhalt von `src/app.html` in den Editor kopieren
5. Rechts erscheint die App-Vorschau
6. Oben rechts: **„Teilen"** → **„Als Website veröffentlichen"** → **„Veröffentlichen"**
7. Du bekommst eine URL: `dein-name.my.canva.site/...`

---

## Update deployen

1. Canva-Design öffnen
2. Canva Code App öffnen
3. Code aktualisieren (Ctrl+A → neuen Code einfügen)
4. **„Teilen"** → **„Als Website veröffentlichen"** → **„Aktualisieren"**

---

## Eigene Domain (optional)

1. Domain kaufen (z.B. bei [inwx.de](https://inwx.de) – ca. €10/Jahr)
2. In Canva: **Einstellungen** → **„Eigene Domain"**
3. DNS-Einträge beim Domain-Anbieter setzen (Canva zeigt die Werte)

---

## Einschränkungen von Canva Code

| Feature | Status |
|---|---|
| HTML + CSS + JS | ✅ vollständig |
| Externe APIs (Firebase) | ✅ via fetch() |
| Lokaler Storage | ✅ localStorage |
| Server-Side Code | ❌ nicht möglich |
| Echter Kiosk-Modus | ❌ nur Fullscreen API |
| Hintergrundprozesse | ❌ nicht möglich |

> Für echten Kiosk-Modus → [Native App mit Capacitor](ARCHITECTURE.md#native-app)
