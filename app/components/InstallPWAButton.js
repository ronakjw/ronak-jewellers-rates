"use client";

import { useEffect, useState } from "react";

let savedPrompt = null;
let listeners = [];

function notifyListeners() {
  listeners.forEach((fn) => fn(savedPrompt));
}

export default function InstallPWAButton({ variant = "floating", style = {} }) {
  const [deferredPrompt, setDeferredPrompt] = useState(savedPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const updatePrompt = (prompt) => {
      setDeferredPrompt(prompt);
    };

    listeners.push(updatePrompt);

    const handler = (e) => {
      e.preventDefault();
      savedPrompt = e;
      setDeferredPrompt(e);
      notifyListeners();
    };

    const appInstalledHandler = () => {
      savedPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      notifyListeners();
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", appInstalledHandler);

    return () => {
      listeners = listeners.filter((fn) => fn !== updatePrompt);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      alert(
   "To install this app manually:\n\n" +
      "Chrome / Android:\n" +
      "Tap the ⋮ menu at the top-right of your browser, then tap 'Add to Home screen' or 'Install app'.\n\n" +
      "iPhone / Safari:\n" +
      "Tap the Share button, then tap 'Add to Home Screen'.\n\n" +
      "If you already installed it, open it from your home screen."
      );
      return;
    }

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    savedPrompt = null;
    setDeferredPrompt(null);
    notifyListeners();

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
  };

  const baseStyle =
    variant === "sidebar"
      ? style
      : {
          position: "fixed",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#C9A227",
          color: "#000",
          border: "none",
          borderRadius: "999px",
          padding: "14px 22px",
          fontWeight: "700",
          fontSize: "15px",
          boxShadow: "0 8px 25px rgba(201,162,39,0.35)",
          cursor: "pointer",
        };

  if (variant === "floating" && (!deferredPrompt || isInstalled)) {
    return null;
  }

  return (
    <button
      id={variant === "floating" ? "install-app-button" : undefined}
      type="button"
      onClick={installApp}
      disabled={isInstalled}
      style={{
        ...baseStyle,
        opacity: isInstalled ? 0.65 : 1,
        cursor: isInstalled ? "not-allowed" : "pointer",
      }}
    >
      {isInstalled ? "✅ App Installed" : "📲 Install / Add to Home Screen"}
    </button>
  );
}
