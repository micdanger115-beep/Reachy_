/**
 * Reachy Telefon — Handy-Webapp, die Reachy Mini wie ein Gegensprech-Telefon nutzt:
 *   - Kopfsteuerung per Touch-Pad (pitch/yaw) + Body-Yaw + Antennen
 *   - Intercom: Handy-Mikro -> Roboter-Lautsprecher (WebRTC replaceTrack)
 *   - Ich höre Reachy: Roboter-Mikro/Kamera -> <video> (media.attachVideo)
 *
 * Verbindungsaufbau läuft über den Host-Shell (OAuth + Signaling); der
 * eigentliche Audio-/Videoverkehr ist danach P2P/lokal (WireGuard).
 */
import { connectToHost } from "@pollen-robotics/reachy-mini-sdk/host/embed";
import { rpyToMatrix } from "@pollen-robotics/reachy-mini-sdk";
// ---- Bewegungs-Grenzen (Grad an der UI-Grenze; SDK clamped zusätzlich) ----
const HEAD_PITCH_MAX = 30; // sicher innerhalb ±40°
const HEAD_YAW_MAX = 60; // Kopf-Body-Delta max. 65°, daher konservativ
const BODY_YAW_MAX = 90;
const ANTENNA_MAX = 45;
const SEND_INTERVAL_MS = 40; // ~25 Hz Ziel-Rate beim Ziehen
// Richtungs-Vorzeichen (falls am echten Roboter invertiert: hier umdrehen)
const PITCH_SIGN = -1; // Pad nach oben ziehen -> nach oben schauen
const YAW_SIGN = 1; // Pad nach rechts ziehen -> nach rechts schauen
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
async function main() {
    const handle = await connectToHost();
    const { reachy, theme, media, onLeave, onThemeChange } = handle;
    const root = document.getElementById("root") ?? document.body;
    document.documentElement.setAttribute("data-theme", theme);
    onThemeChange((t) => document.documentElement.setAttribute("data-theme", t));
    injectStyles();
    root.innerHTML = template(handle.userName, handle.appName);
    const $ = (sel) => root.querySelector(sel);
    // ---------------------------------------------------------------- Video/Audio
    const video = $("#robot-video");
    video.autoplay = true;
    video.playsInline = true;
    const detachVideo = media.attachVideo(video);
    // Reachy hörbar (Roboter-Mikro kommt im selben Stream wie das Video).
    reachy.setAudioMuted(false);
    const hearVol = $("#hear-volume");
    const applyHearVolume = () => {
        video.volume = clamp(Number(hearVol.value) / 100, 0, 1);
    };
    hearVol.addEventListener("input", applyHearVolume);
    applyHearVolume();
    // Autoplay auf dem Handy kann Audio blockieren -> Tap-to-Start Fallback.
    const tapOverlay = $("#tap-to-start");
    const tryPlay = () => {
        video.play().then(() => tapOverlay.classList.add("hidden"), () => tapOverlay.classList.remove("hidden"));
    };
    tapOverlay.addEventListener("click", tryPlay);
    tryPlay();
    // "Reachy stumm" (lokal): blendet aus, was ich höre.
    const hearMuteBtn = $("#hear-mute");
    let hearMuted = false;
    hearMuteBtn.addEventListener("click", () => {
        hearMuted = !hearMuted;
        reachy.setAudioMuted(hearMuted);
        video.muted = hearMuted;
        hearMuteBtn.classList.toggle("active", hearMuted);
        hearMuteBtn.textContent = hearMuted ? "🔇 Ton aus" : "🔊 Ton an";
    });
    // ------------------------------------------------------------- Mikro (Intercom)
    // Sendet das Handy-Mikro auf den Roboter-Lautsprecher via replaceTrack auf
    // dem vom SDK vorbereiteten (stillen) Audio-Sender.
    let micTrack = null;
    let micStream = null;
    let micLocked = false; // Freisprech-Modus (dauerhaft an)
    const talkBtn = $("#talk");
    const lockBtn = $("#talk-lock");
    const micStatus = $("#mic-status");
    const getAudioSender = () => {
        const pc = reachy._pc;
        if (!pc)
            return null;
        const senders = pc.getSenders();
        return (senders.find((s) => s.track?.kind === "audio") ??
            pc
                .getTransceivers()
                .map((t) => t.sender)
                .find((s) => s.track?.kind === "audio") ??
            null);
    };
    const setTalking = (on) => {
        if (micTrack)
            micTrack.enabled = on;
        talkBtn.classList.toggle("talking", on);
        micStatus.textContent = on ? "🎙️ sendet…" : micTrack ? "Bereit" : "aus";
    };
    const enableMic = async () => {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            micTrack = micStream.getAudioTracks()[0] ?? null;
            if (!micTrack)
                throw new Error("Kein Mikrofon-Track");
            micTrack.enabled = false;
            const sender = getAudioSender();
            if (!sender)
                throw new Error("Kein Audio-Sender in der WebRTC-Verbindung gefunden");
            await sender.replaceTrack(micTrack);
            micStatus.textContent = "Bereit";
            talkBtn.disabled = false;
            lockBtn.disabled = false;
            $("#mic-enable").classList.add("hidden");
        }
        catch (err) {
            micStatus.textContent = "Mikro nicht verfügbar";
            console.warn("[reachy-telefon] Mikro konnte nicht aktiviert werden:", err);
        }
    };
    $("#mic-enable").addEventListener("click", enableMic);
    // Push-to-Talk (halten zum Sprechen)
    const pttDown = (e) => {
        if (micLocked || !micTrack)
            return;
        e.preventDefault();
        setTalking(true);
    };
    const pttUp = () => {
        if (micLocked)
            return;
        setTalking(false);
    };
    talkBtn.addEventListener("pointerdown", pttDown);
    talkBtn.addEventListener("pointerup", pttUp);
    talkBtn.addEventListener("pointerleave", pttUp);
    talkBtn.addEventListener("pointercancel", pttUp);
    // Freisprech-Sperre (dauerhaft senden)
    lockBtn.addEventListener("click", () => {
        micLocked = !micLocked;
        lockBtn.classList.toggle("active", micLocked);
        lockBtn.textContent = micLocked ? "🔒 Freisprechen an" : "🔓 Freisprechen";
        setTalking(micLocked);
    });
    // -------------------------------------------------------- Reachy-Lautstärke
    const speakVol = $("#speak-volume");
    const speakVolLabel = $("#speak-volume-label");
    reachy.getVolume().then((v) => {
        if (typeof v === "number") {
            speakVol.value = String(Math.round(v));
            speakVolLabel.textContent = `${Math.round(v)}%`;
        }
    });
    speakVol.addEventListener("input", () => {
        speakVolLabel.textContent = `${speakVol.value}%`;
    });
    speakVol.addEventListener("change", () => {
        void reachy.setVolume(Number(speakVol.value));
    });
    // ------------------------------------------------------------ Kopf-Touchpad
    const pad = $("#head-pad");
    const knob = $("#head-knob");
    let padActive = false;
    let lastSend = 0;
    let curPitch = 0;
    let curYaw = 0;
    const sendHead = (force = false) => {
        const now = performance.now();
        if (!force && now - lastSend < SEND_INTERVAL_MS)
            return;
        lastSend = now;
        reachy.setHeadRpyDeg(0, curPitch, curYaw);
    };
    const updatePad = (clientX, clientY) => {
        const rect = pad.getBoundingClientRect();
        const nx = clamp((clientX - rect.left) / rect.width, 0, 1) * 2 - 1; // [-1,1]
        const ny = clamp((clientY - rect.top) / rect.height, 0, 1) * 2 - 1; // [-1,1]
        curYaw = YAW_SIGN * nx * HEAD_YAW_MAX;
        curPitch = PITCH_SIGN * ny * HEAD_PITCH_MAX;
        knob.style.left = `${(nx * 0.5 + 0.5) * 100}%`;
        knob.style.top = `${(ny * 0.5 + 0.5) * 100}%`;
        sendHead();
    };
    const padDown = (e) => {
        padActive = true;
        pad.setPointerCapture(e.pointerId);
        updatePad(e.clientX, e.clientY);
    };
    const padMove = (e) => {
        if (padActive)
            updatePad(e.clientX, e.clientY);
    };
    const padUp = (e) => {
        if (!padActive)
            return;
        padActive = false;
        try {
            pad.releasePointerCapture(e.pointerId);
        }
        catch {
            /* ignore */
        }
        // Kopf beim Loslassen sanft zurück zur Mitte (optional weglassbar).
        // Wir belassen die Position: der Kopf bleibt, wo er zuletzt war.
        sendHead(true);
    };
    pad.addEventListener("pointerdown", padDown);
    pad.addEventListener("pointermove", padMove);
    pad.addEventListener("pointerup", padUp);
    pad.addEventListener("pointercancel", padUp);
    // ------------------------------------------------------------- Body-Yaw
    const bodySlider = $("#body-yaw");
    const bodyLabel = $("#body-yaw-label");
    bodySlider.addEventListener("input", () => {
        const v = clamp(Number(bodySlider.value), -BODY_YAW_MAX, BODY_YAW_MAX);
        bodyLabel.textContent = `${v}°`;
        reachy.setBodyYawDeg(v);
    });
    // ------------------------------------------------------------- Antennen
    const antSlider = $("#antennas");
    const antLabel = $("#antennas-label");
    antSlider.addEventListener("input", () => {
        const v = clamp(Number(antSlider.value), -ANTENNA_MAX, ANTENNA_MAX);
        antLabel.textContent = `${v}°`;
        reachy.setAntennasDeg(v, v);
    });
    // --------------------------------------------------------- Zentrieren/Reset
    const returnToInit = (duration = 0.5) => {
        reachy.gotoTarget({
            head: rpyToMatrix(0, 0, 0).flat(),
            antennas: [0, 0],
            body_yaw: 0,
            duration,
        });
    };
    $("#center").addEventListener("click", () => {
        curPitch = 0;
        curYaw = 0;
        knob.style.left = "50%";
        knob.style.top = "50%";
        bodySlider.value = "0";
        bodyLabel.textContent = "0°";
        antSlider.value = "0";
        antLabel.textContent = "0°";
        returnToInit();
    });
    // ------------------------------------------------------------- Telemetrie
    const statusDot = $("#status-dot");
    reachy.addEventListener("state", (e) => {
        const detail = e.detail;
        statusDot.classList.toggle("awake", detail.motor_mode === "enabled");
    });
    const onGone = () => {
        statusDot.classList.remove("awake");
        $("#connection-lost").classList.remove("hidden");
    };
    reachy.addEventListener("sessionStopped", onGone);
    reachy.addEventListener("disconnected", onGone);
    // ---------------------------------------------------------------- Teardown
    onLeave(async () => {
        try {
            returnToInit(0.6);
        }
        catch {
            /* ignore */
        }
        detachVideo();
        if (micTrack)
            micTrack.enabled = false;
        micStream?.getTracks().forEach((t) => t.stop());
    });
}
// ================================================================== UI-Template
function template(userName, appName) {
    return `
  <div class="app">
    <header class="topline">
      <span class="brand">📞 ${escapeHtml(appName)}</span>
      <span class="who">${userName ? escapeHtml(userName) : ""}
        <span id="status-dot" class="dot" title="Motor-Status"></span>
      </span>
    </header>

    <section class="stage">
      <video id="robot-video" muted></video>
      <div id="tap-to-start" class="overlay hidden"><button class="pill">▶︎ Tippen zum Starten</button></div>
      <div id="connection-lost" class="overlay hidden"><div class="pill warn">Verbindung beendet</div></div>
    </section>

    <section class="controls">
      <div class="row">
        <div class="pad-wrap">
          <div class="label">Kopf bewegen</div>
          <div id="head-pad" class="pad"><div id="head-knob" class="knob"></div></div>
        </div>
        <div class="talk-wrap">
          <div class="label">Sprechen</div>
          <button id="mic-enable" class="btn big">🎤 Mikro aktivieren</button>
          <button id="talk" class="btn big talk hidden-when-disabled" disabled>🎙️ Halten zum Sprechen</button>
          <button id="talk-lock" class="btn ghost" disabled>🔓 Freisprechen</button>
          <div id="mic-status" class="hint">aus</div>
        </div>
      </div>

      <div class="sliders">
        <label class="slider">
          <span>Körper drehen <b id="body-yaw-label">0°</b></span>
          <input id="body-yaw" type="range" min="-${BODY_YAW_MAX}" max="${BODY_YAW_MAX}" value="0" />
        </label>
        <label class="slider">
          <span>Antennen <b id="antennas-label">0°</b></span>
          <input id="antennas" type="range" min="-${ANTENNA_MAX}" max="${ANTENNA_MAX}" value="0" />
        </label>
        <label class="slider">
          <span>Reachy-Lautstärke <b id="speak-volume-label">–</b></span>
          <input id="speak-volume" type="range" min="0" max="100" value="70" />
        </label>
        <label class="slider">
          <span>Hörlautstärke (Handy)</span>
          <input id="hear-volume" type="range" min="0" max="100" value="100" />
        </label>
      </div>

      <div class="row buttons">
        <button id="hear-mute" class="btn ghost">🔊 Ton an</button>
        <button id="center" class="btn ghost">🎯 Zentrieren</button>
      </div>
    </section>
  </div>`;
}
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
// ===================================================================== Styles
function injectStyles() {
    const css = `
  :root{
    --bg:#0e0f13; --panel:#171922; --panel2:#20232f; --text:#f2f3f7;
    --muted:#9aa0b4; --accent:#4f8cff; --accent2:#22c55e; --danger:#ef4444;
    --border:#2a2e3c; --radius:16px;
  }
  :root[data-theme="light"]{
    --bg:#f5f6fa; --panel:#ffffff; --panel2:#eef0f6; --text:#12131a;
    --muted:#5b6072; --accent:#2f6bff; --accent2:#16a34a; --danger:#dc2626;
    --border:#e2e5ee;
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{margin:0;height:100%;background:var(--bg);color:var(--text);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
  #root{height:100%;}
  .app{display:flex;flex-direction:column;height:100dvh;max-width:640px;margin:0 auto;
    padding:max(8px,env(safe-area-inset-top)) 12px max(10px,env(safe-area-inset-bottom));gap:10px;}
  .topline{display:flex;justify-content:space-between;align-items:center;font-size:15px;}
  .brand{font-weight:700;}
  .who{color:var(--muted);display:flex;align-items:center;gap:8px;}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--muted);display:inline-block;}
  .dot.awake{background:var(--accent2);box-shadow:0 0 8px var(--accent2);}

  .stage{position:relative;flex:1 1 auto;min-height:180px;background:#000;border-radius:var(--radius);
    overflow:hidden;border:1px solid var(--border);}
  #robot-video{width:100%;height:100%;object-fit:cover;display:block;background:#000;}
  .overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,.45);}
  .overlay.hidden{display:none;}
  .pill{border:none;border-radius:999px;padding:12px 20px;font-size:16px;font-weight:600;
    background:var(--accent);color:#fff;cursor:pointer;}
  .pill.warn{background:var(--danger);}

  .controls{display:flex;flex-direction:column;gap:12px;}
  .row{display:flex;gap:12px;}
  .label{font-size:13px;color:var(--muted);margin-bottom:6px;}

  .pad-wrap{flex:1 1 50%;}
  .pad{position:relative;width:100%;aspect-ratio:1/1;max-height:200px;background:
    radial-gradient(circle at center,var(--panel2),var(--panel));border:1px solid var(--border);
    border-radius:var(--radius);touch-action:none;overflow:hidden;}
  .pad::before,.pad::after{content:"";position:absolute;background:var(--border);}
  .pad::before{left:50%;top:8%;bottom:8%;width:1px;transform:translateX(-.5px);}
  .pad::after{top:50%;left:8%;right:8%;height:1px;transform:translateY(-.5px);}
  .knob{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;
    border-radius:50%;background:var(--accent);box-shadow:0 2px 10px rgba(0,0,0,.4);
    border:3px solid #fff3;pointer-events:none;transition:left .04s linear,top .04s linear;}

  .talk-wrap{flex:1 1 50%;display:flex;flex-direction:column;gap:8px;}
  .hint{font-size:12px;color:var(--muted);text-align:center;}

  .btn{border:1px solid var(--border);background:var(--panel);color:var(--text);
    border-radius:12px;padding:12px;font-size:15px;font-weight:600;cursor:pointer;
    min-height:44px;user-select:none;}
  .btn:disabled{opacity:.45;cursor:not-allowed;}
  .btn.big{flex:1;font-size:16px;}
  .btn.ghost{background:var(--panel2);}
  .btn.active{background:var(--accent);color:#fff;border-color:transparent;}
  .btn.talk{background:var(--accent2);color:#062012;border-color:transparent;touch-action:none;}
  .btn.talk.talking{background:var(--danger);color:#fff;transform:scale(.99);}
  .hidden{display:none!important;}

  .buttons{gap:12px;}
  .buttons .btn{flex:1;}

  .sliders{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;}
  .slider{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted);}
  .slider b{color:var(--text);}
  .slider input[type=range]{width:100%;height:28px;accent-color:var(--accent);}

  @media (max-width:420px){ .sliders{grid-template-columns:1fr;} }
  `;
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
}
void main().catch((err) => {
    console.error("[reachy-telefon] boot failed", err);
    window.parent.postMessage({ source: "reachy-mini", type: "embed:error", version: 1, message: String(err), fatal: true }, window.location.origin);
});
//# sourceMappingURL=embed.js.map