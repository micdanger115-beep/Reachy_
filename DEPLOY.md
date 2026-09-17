# Deployment auf einen Hugging-Face-Space (`hf` CLI)

Die App ist ein **statischer** HF Space (`sdk: static`). Du pushst nur den
**Quellcode** – Hugging Face führt selbst `app_build_command` aus
(`npm ci --include=dev && npm run build`) und serviert `app_file`
(`dist/index.html`). **`dist/` wird nicht committet** (steht in `.gitignore`).

Der HF-Login (OAuth) wird auf dem Space **automatisch** verdrahtet
(`hf_oauth: true`) – du musst keine Client-ID eintragen.

---

## Einmalige Schritte

```bash
# 1) HF CLI installieren und einloggen
#    Token mit WRITE-Rechten: https://huggingface.co/settings/tokens
pip install -U "huggingface_hub[cli]"
hf auth login          # Token einfügen; "Add token as git credential?" mit Yes bestätigen

# 2) Space anlegen (static SDK)
hf repos create reachy-telefon --repo-type space --space-sdk static
#    -> https://huggingface.co/spaces/<DEIN_USER>/reachy-telefon
#    (Alternativ per Web-UI: New Space -> SDK "Static")

# 3) Dieses Repo lokal holen (falls noch nicht vorhanden) und HF als Remote setzen
git clone https://github.com/micdanger115-beep/Reachy_.git
cd Reachy_
git checkout claude/laughing-bell-3sxhsv
git remote add space https://huggingface.co/spaces/<DEIN_USER>/reachy-telefon

# 4) Quellcode auf den Space pushen (wird dort zum main-Branch)
git push space claude/laughing-bell-3sxhsv:main
```

Nach dem Push baut HF automatisch. Die App läuft dann unter:

```
https://<DEIN_USER>-reachy-telefon.hf.space
```

## Updates später

```bash
# im lokalen Repo, nach neuen Commits:
git push space claude/laughing-bell-3sxhsv:main
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

## Hinweis zum Datenfluss

Der Space liefert nur die **Seite** aus. Login + Verbindungsaufbau laufen kurz
über den zentralen HF-Signaling-Server; der eigentliche **Audio-/Video-/
Steuerungsverkehr geht direkt und lokal (P2P) zwischen Handy und Roboter** –
nicht über Hugging Face.
