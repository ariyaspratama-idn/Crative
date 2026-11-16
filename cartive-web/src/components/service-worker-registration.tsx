"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
      const cleanupKey = "cartive-dev-service-worker-cleanup";
      void navigator.serviceWorker.getRegistrations()
        .then(async (registrations) => {
          if (registrations.length === 0) return;
          await Promise.all(registrations.map((registration) => registration.unregister()));
          if (
            navigator.serviceWorker.controller &&
            sessionStorage.getItem(cleanupKey) !== "done"
          ) {
            sessionStorage.setItem(cleanupKey, "done");
            window.location.reload();
          }
        })
        .catch((error: unknown) => {
          console.error("Cartive development service worker cleanup failed.", error);
        });
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Cartive service worker registration failed.", error);
    });
  }, []);

  return null;
}
