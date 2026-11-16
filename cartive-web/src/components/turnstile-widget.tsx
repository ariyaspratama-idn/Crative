"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileWidgetApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: "login" | "claim";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidgetApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(new Error("Proteksi anti-bot tidak dapat dimuat."));
    };
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  action: "login" | "claim";
  onToken: (token: string) => void;
};

export default function TurnstileWidget({
  action,
  onToken,
}: TurnstileWidgetProps) {
  const siteKey = process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState(siteKey
    ? "Memuat pemeriksaan keamanan…"
    : process.env.NODE_ENV === "development"
      ? "Proteksi anti-bot dinonaktifkan di pengembangan lokal."
      : "Proteksi anti-bot belum dikonfigurasi untuk situs ini.");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;

    let active = true;
    let widgetId: string | null = null;

    void loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: (token) => {
            if (!active) return;
            setToken(token);
            onToken(token);
            setMessage("");
          },
          "expired-callback": () => {
            if (!active) return;
            setToken("");
            onToken("");
            setMessage("Pemeriksaan kedaluwarsa. Selesaikan kembali untuk melanjutkan.");
            if (widgetId) window.turnstile?.reset(widgetId);
          },
          "error-callback": () => {
            if (!active) return;
            setToken("");
            onToken("");
            setMessage("Pemeriksaan keamanan tidak tersedia. Coba muat ulang halaman.");
          },
        });
      })
      .catch(() => {
        if (active) setMessage("Pemeriksaan keamanan tidak tersedia. Coba muat ulang halaman.");
      });

    return () => {
      active = false;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [action, onToken, siteKey]);

  return (
    <div className="turnstile-control">
      {siteKey && <div ref={containerRef} />}
      {message && <p className="field-hint" role="status">{message}</p>}
      <input type="hidden" name="turnstileToken" value={token} readOnly />
    </div>
  );
}
