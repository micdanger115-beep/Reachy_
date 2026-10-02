# Session Context (agents.local.md)

> Lokaler Kontext für AI-Agenten. Nicht Teil der öffentlichen App-Logik.
> Basiert auf den Richtlinien aus https://github.com/pollen-robotics/reachy_mini/blob/main/AGENTS.md

## Roboter
- **Variante:** Wireless (CM4)
  - Verbindung: WLAN via CM4
  - Compute: begrenzt (Speicher/CPU-constrained) → schwere Berechnungen in den Browser/Space auslagern
  - Daemon-Adresse: `reachy-mini.local:8000` oder Roboter-IP

## Entwicklung
- **App-Flavor:** JavaScript / Web (Browser, WebRTC, teilbarer Link)
  - Roboter bleibt reines IO-Gerät, Compute läuft im Browser/Space-Backend
  - Single Source of Truth: `ts/APP_CREATION_GUIDE.md` (im reachy_mini-Upstream)
  - Golden Path: `skills/create-js-app.md`
  - SDK-Pin: `@pollen-robotics/reachy-mini-sdk@1.8.0`
- **Design:** Mobile-first (Smartphone-Nutzung als Standard annehmen)

## Arbeitsweise (aus AGENTS.md)
- Vor nicht-trivialen Apps zuerst `plan.md` schreiben und Freigabe einholen
- App-Ordner nicht von Hand anlegen – Referenz-Apps klonen/trimmen
- Referenz-Apps: `reachy_mini_minimal_conversation` (Vanilla TS), `reachy_mini_emotions` (React 19 + MUI), `reachy_mini_telepresence` (Kamera/Media)

## Projekte in diesem Repo
- Root (`src/`, `index.html`): **Reachy Telefon** – JS-Webapp (Kopfsteuerung, Intercom, Kamera).
- `reachy_claude/`: **Reachy Claude** – Sprache → Claude Code auf dem Windows-PC.
  Nutzt die offizielle Python-Conversation-App (Profil + externes Tool, kein Fork),
  PC-Dienst `claude-bridge`, optionaler Patch für Zuhör-Bewegung.
  Einstieg: `reachy_claude/README.md` (§9 = Stand & nächste Schritte), `plan.md`, `SECURITY.md`.

## Präferenzen / Notizen
- Sprache der Zusammenarbeit: Deutsch
- PC des Nutzers: Windows; Reachy und PC im selben WLAN
- Datensparsamkeit hat hohe Priorität (lokale Sprachverarbeitung)
- Immer: Tests ausführen, aktuelle Patterns, Sicherheitsaspekte prüfen, alles dokumentieren
