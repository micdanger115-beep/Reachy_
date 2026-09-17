import { ReachyMini } from "@pollen-robotics/reachy-mini-sdk";

// Expose the SDK constructor for the host shell / embed bootstrap.
(window as unknown as { ReachyMini: typeof ReachyMini }).ReachyMini = ReachyMini;
window.dispatchEvent(new Event("reachymini:ready"));

const params = new URLSearchParams(window.location.search);
const isEmbed = params.get("embedded") === "1" || params.get("embed") === "1";

if (isEmbed) {
  // Inside the host iframe: run the actual app.
  void import("./embed");
} else {
  // Standalone: mount the host shell (OAuth, robot picker, top bar, leave flow).
  void import("@pollen-robotics/reachy-mini-sdk/host/auto").then(({ mountHost }) => {
    mountHost({
      appName: "Reachy Telefon",
      appIconUrl: "/icon.svg",
      appEmoji: "📞",
      // Grants the embedded iframe microphone access so we can send the
      // phone's mic to the robot speaker (intercom).
      enableMicrophone: true,
      devToken:
        import.meta.env.VITE_HF_TOKEN && import.meta.env.VITE_HF_USERNAME
          ? {
              token: import.meta.env.VITE_HF_TOKEN as string,
              userName: import.meta.env.VITE_HF_USERNAME as string,
            }
          : undefined,
      clientId: import.meta.env.VITE_HF_OAUTH_CLIENT_ID as string | undefined,
    });
  });
}
