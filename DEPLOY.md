# Deployment auf einen Hugging-Face-Space

## Empfohlen: automatisch per GitHub Action

Der Workflow `.github/workflows/deploy-hf-space.yml` legt den Space bei Bedarf
selbst an und lädt den Quellcode hoch; HF baut ihn dann. Einmalige Einrichtung:

1. **HF-Write-Token** erstellen: https://huggingface.co/settings/tokens
   (Type „Write", oder fein-granular mit Schreibrecht auf Spaces).
2. In **GitHub** → Repo `Reachy_` → **Settings → Secrets and variables → Actions**:
   - Tab **Secrets** → **New repository secret**: Name `HF_TOKEN`, Wert = dein Token.
   - (Optional) Tab **Variables** → **New variable**: Name `HF_SPACE`, Wert = gewünschter
     Space-Name (Standard, falls leer: `reachy-telefon`).
3. **Actions** aktivieren (falls nötig) und den Workflow starten:
   **Actions → „Deploy to Hugging Face Space" → Run workflow** – oder einfach den
   nächsten Commit pushen.

Danach läuft die App unter `https://<DEIN_USER>-<space>.hf.space`. Jeder weitere
Push auf `main` bzw. den Feature-Branch deployt automatisch neu.

> Der Token liegt nur als **verschlüsseltes GitHub-Secret** vor und ist im Log
> nicht sichtbar.

---

## Alternative: manuell per `hf` CLI

Die App ist ein **statischer** HF Space (`sdk: static`). Du pushst nur den
**Quellcode** – Hugging Face führt selbst `app_build_command` aus
(`npm ci --include=dev && npm run build`) und serviert `app_file`
(`dist/index.html`). **`dist/` wird nicht committet** (steht in `.gitignore`).

Der HF-Login (OAuth) wird auf dem Space **automatisch** verdrahtet
(`hf_oauth: true`) – du musst keine Client-ID eintragen.

---

> **Wichtig:** Ein HF-seitiger **Static-Space-Build ist kostenpflichtig
> (Credits)**. Deshalb bauen wir **lokal bzw. in CI** und laden nur die fertigen
> Dateien aus `dist/` hoch – ein reiner Datei-Upload braucht keine Credits.
> Lade daher **nicht** den Quellcode mit `app_build_command` hoch.

## Einmalige Schritte

```bash
# 1) HF CLI installieren und einloggen
#    Token mit WRITE-Rechten: https://huggingface.co/settings/tokens
pip install -U "huggingface_hub[cli]"
hf auth login          # Token einfügen

# 2) App lokal bauen
npm ci && npm run build     # erzeugt dist/

# 3) Static-Space-README neben die gebauten Dateien legen (ohne Build-Befehl!)
cat > dist/README.md <<'MD'
---
title: Reachy Telefon
emoji: "📞"
sdk: static
app_file: index.html
hf_oauth: true
hf_oauth_expiration_minutes: 43200
tags:
  - reachy_mini
  - reachy_mini_js_app
---
Vorgebaute statische App.
MD

# 4) Space anlegen (falls noch nicht vorhanden) und NUR dist/ hochladen
hf repos create reachy-telefon --repo-type space --space-sdk static || true
hf upload <DEIN_USER>/reachy-telefon ./dist . --repo-type space --delete "*"
```

Die App läuft dann unter:

```
https://<DEIN_USER>-reachy-telefon.hf.space
```

## Updates später

```bash
npm ci && npm run build
# dist/README.md wie oben neu erzeugen (falls nicht mehr vorhanden), dann:
hf upload <DEIN_USER>/reachy-telefon ./dist . --repo-type space --delete "*"
```

---

## Checkliste vor dem ersten Test

- [ ] **Roboter online**: Der Reachy-Daemon läuft und ist mit **demselben
      Hugging-Face-Account** angemeldet, mit dem du dich in der App einloggst –
      nur dann taucht der Roboter im Picker auf.
- [ ] **Handy & Roboter im selben Netz** (bei dir: via WireGuard), damit der
      WebRTC-Medienstrom direkt/lokal läuft.
- [ ] **HTTPS**: erledigt der HF Space automatisch (`https://…hf.space`) → das
      Handy-Mikrofon ist freigegeben.
- [ ] Beim ersten Login ggf. die OAuth-App **autorisieren**.
- [ ] In der App **„Mikro aktivieren"** antippen und den Browser-Mikro-Dialog
      erlauben.

- [ ] **Kein HF-Build nötig**: Wir laden fertige Dateien hoch → der Space steht
      sofort auf „Running" (kein „Building"), ohne Credits.

## Hinweis zum Datenfluss

Der Space liefert nur die **Seite** aus. Login + Verbindungsaufbau laufen kurz
über den zentralen HF-Signaling-Server; der eigentliche **Audio-/Video-/
Steuerungsverkehr geht direkt und lokal (P2P) zwischen Handy und Roboter** –
nicht über Hugging Face.
