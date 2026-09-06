import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!installEvent || dismissed) {
    return null;
  }

  const installApp = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstallEvent(null);
    }
  };

  return (
    <aside className="pwa-install-prompt" aria-label="Install Washora">
      <img src="/washora-logo.jpeg" alt="" />
      <div>
        <strong>Install Washora</strong>
        <span>Open your admin dashboard like an app.</span>
      </div>
      <button className="pwa-install-prompt__install" type="button" onClick={installApp}>
        <Download size={16} />
        Install
      </button>
      <button
        className="pwa-install-prompt__dismiss"
        type="button"
        onClick={() => setDismissed(true)}
        title="Dismiss install prompt"
        aria-label="Dismiss install prompt"
      >
        <X size={16} />
      </button>
    </aside>
  );
}