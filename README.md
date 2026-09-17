---
title: Reachy Telefon
emoji: 📞
colorFrom: blue
colorTo: green
sdk: static
app_build_command: npm ci --include=dev && npm run build
app_file: dist/index.html
pinned: false
hf_oauth: true
hf_oauth_expiration_minutes: 43200
short_description: Reachy Mini als Gegensprech-Telefon mit Kopfsteuerung.
tags:
  - reachy_mini
  - reachy_mini_js_app
---

# Reachy Telefon 📞

Eine mobile Webapp, die **Reachy Mini** wie ein **Gegensprech-Telefon** nutzt:

- **Kopf steuern** per Touch-Pad (Neigen/Drehen), Körper drehen, Antennen bewegen
- **Sprechen** – dein Handy-Mikrofon geht auf Reachys Lautsprecher (Push-to-Talk oder Freisprechen)
- **Hören** – du hörst auf dem Handy, was Reachy hört (Mikro + Kamera-Livebild)

Der Verbindungsaufbau läuft über den offiziellen Host-Shell (Hugging-Face-Login +
Signaling). Der eigentliche **Audio-/Videoverkehr ist danach Peer-to-Peer** und
bleibt in deinem lokalen Netz (z. B. über WireGuard).

## Bedienung

| Element | Funktion |
|--------|----------|
| **Kopf-Pad** | Ziehen = Reachy schaut in die Richtung (Pitch/Yaw) |
| **Mikro aktivieren** | Einmalig Mikrofon-Zugriff erlauben |
| **Halten zum Sprechen** | Push-to-Talk: nur während des Haltens wird gesendet |
| **Freisprechen** | Mikro dauerhaft an (Freisprech-Modus) |
| **Körper drehen / Antennen** | Slider |
| **Reachy-Lautstärke** | Wie laut Reachy deine Stimme abspielt |
| **Hörlautstärke** | Wie laut dein Handy Reachy wiedergibt |
| **Ton an/aus** | Blendet lokal aus, was du hörst |
| **Zentrieren** | Kopf/Körper/Antennen sanft zurück in Grundstellung |

## Lokale Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
```

Für den Login ohne OAuth-Dialog eine `.env.local` (nicht committen!) anlegen:

```
VITE_HF_TOKEN=hf_dein_token
VITE_HF_USERNAME=dein_handle
```

## Build

```bash
npm ci && npm run build   # erzeugt dist/
```

Nur den Quellcode deployen – nicht `dist/` committen. Hugging Face führt
`app_build_command` aus und serviert `app_file`.

## Robotertyp

Entwickelt für **Reachy Mini Wireless (CM4)**. Weil die Wireless-Variante
CPU-/Speicher-begrenzt ist, läuft die gesamte App-Logik im Browser; der Roboter
bleibt reines IO-Gerät.
