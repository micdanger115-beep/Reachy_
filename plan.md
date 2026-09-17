# plan.md — Reachy Mini als "Telefon" (Handy-Webapp)

Status: **ENTWURF – wartet auf Freigabe/Antworten des Nutzers**

## 1. Was der Nutzer will (mein Verständnis)

Eine **Webapp fürs Handy**, die Reachy Mini (Wireless/CM4) im lokalen Netz
(erreichbar über WireGuard) wie ein **Gegensprech-Telefon** nutzt:

1. **Kopfsteuerung** vom Handy aus (Kopf bewegen, evtl. Body-Drehung/Antennen).
2. **"Reachy sagt, was ich ins Handy spreche"** → Handy-Mikrofon → Roboter-Lautsprecher
   (Live-Durchleitung meiner Stimme = Intercom).
3. **"Ich höre auf dem Handy, was Reachy hört"** → Roboter-Mikrofon → Handy-Lautsprecher.
4. Alles möglichst **lokal** (Zugang via WireGuard).

## 2. Technische Realität (aus der Upstream-Doku recherchiert)

| Baustein | Mechanismus | Lokal? |
|----------|-------------|--------|
| Kopf/Body/Antennen steuern | `setHeadRpyDeg`, `setBodyYawDeg`, `setAntennasDeg` (WebRTC-Datenkanal) **oder** REST `:8000/api/move/*` | REST 100% lokal; WebRTC nach Handshake lokal |
| Reachy → Handy Audio | `attachVideo(el)` bindet WebRTC-Stream (inkl. Roboter-Mikro/Opus) | P2P-lokal nach Handshake |
| Handy → Reachy Audio | Eigenes `getUserMedia({audio})` + `replaceTrack()` auf dem ausgehenden Audio-Sender (SDK stellt "silent placeholder audio sender" bereit; `enableMicrophone` ist deprecated/ignored) | P2P-lokal nach Handshake |
| **Verbindungsaufbau (Signaling + OAuth)** | **zentraler HF-Signaling-Server** (`pollen-robotics-reachy-mini-central.hf.space`) | **NICHT lokal** (nur Handshake, kein Medienverkehr) |

**Konsequenz:** Das Audio-Feature ("Telefon") erfordert WebRTC und damit einen
kurzen Cloud-Handshake beim Verbinden (HF-Login + SDP/ICE-Austausch). Der
eigentliche Audio-/Videoverkehr läuft danach P2P lokal über WireGuard.
Ein *komplett* cloud-freier Betrieb wäre nur für die reine Kopfsteuerung
(REST) möglich – dann aber ohne Audio.

## 3. Vorgeschlagener Ansatz

- **Basis:** Referenz-App `reachy_mini_telepresence` (React 19 + MUI 7 + Vite) klonen
  und trimmen – sie deckt Kamera-/Media-Streams bereits ab und ist das offizielle
  Media-Beispiel. Alternativ TS+Vite Golden Path.
- **Host-Shell verwenden:** `mountHost()` / `connectToHost()` → OAuth, Roboter-Picker,
  Top-Bar, Leave-Flow gratis (AGENTS.md "Always"-Regel).
- **UI (mobile-first):**
  - Touch-Steuerfläche für den Kopf (Neigen/Drehen), optional Body-Yaw + Antennen.
  - Audio: `<video>`/`<audio>`-Element via `attachVideo()` für Reachys Mikrofon.
  - Push-to-Talk / Mute-Toggle: Handy-Mikro via `replaceTrack()` auf den Roboter geben.
  - Lautstärke-Regler (`setVolume`, `setMicrophoneVolume`).
- **Sicherheit/Sauberkeit:** `onLeave(() => safelyReturnToPose(reachy))`,
  Grad an der UI-Grenze / Radiant intern, kontinuierliche Loops per Web-Worker-Heartbeat.
- **SDK-Pin:** `@pollen-robotics/reachy-mini-sdk@1.8.0`.

## 4. Offene Fragen an den Nutzer (bitte beantworten)

1. **Cloud-Handshake ok?**
   Das Audio ("Telefon") braucht beim Verbinden kurz die HF-Cloud (Login + Handshake),
   danach läuft alles lokal/P2P. Ist das akzeptabel?
   → Falls NEIN (wirklich 0 Cloud): dann nur Kopfsteuerung via lokale REST-API, **kein Audio**.
   **Antwort:**

2. **"Reachy sagt, was ich spreche"** = Live-Durchleitung meiner Stimme aus dem
   Lautsprecher (Intercom), richtig? Oder soll eine synthetische Stimme (TTS) sprechen?
   **Antwort:**

3. **Video auch?** Willst du zusätzlich das **Kamerabild** von Reachy auf dem Handy sehen,
   oder reicht **Audio + Kopfsteuerung**?
   **Antwort:**

4. **Hugging-Face-Konto** vorhanden? (Für den OAuth-Login beim Verbinden nötig.)
   **Antwort:**

## 5. Nächste Schritte (nach Freigabe)

1. Referenz-App scaffolden/klonen und trimmen.
2. Kopfsteuerungs-UI + Audio-Pfade (rein/raus) implementieren.
3. Mobile-Test (Chrome DevTools Phone-Emulation, 44px-Touch-Targets).
4. Lokal testen (`npm run dev`, ggf. `.env.local` mit HF-Token) und über WireGuard prüfen.
