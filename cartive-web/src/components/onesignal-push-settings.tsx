"use client";

import { useEffect, useState } from "react";
import {
  getOneSignalInstance,
  hasOneSignalConsent,
  rememberOneSignalConsent,
} from "@/lib/onesignal-client";

export default function OneSignalPushSettings({
  memberId,
}: {
  memberId: string;
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!appId || !hasOneSignalConsent() || !("Notification" in window)) {
      return () => {
        active = false;
      };
    }
    if (Notification.permission !== "granted") {
      rememberOneSignalConsent(false);
      return () => {
        active = false;
      };
    }

    void getOneSignalInstance()
      .then(async (oneSignal) => {
        await oneSignal.setConsentGiven();
        await oneSignal.login(memberId);
        if (active) setEnabled(oneSignal.User.PushSubscription.optedIn === true);
      })
      .catch((error: unknown) => {
        console.error("OneSignal subscription could not be restored.", error);
        if (active) setMessage("Status notifikasi belum dapat diperiksa.");
      });

    return () => {
      active = false;
    };
  }, [appId, memberId]);

  if (!appId) return null;

  async function enableNotifications() {
    setBusy(true);
    setMessage("");
    try {
      if (!("Notification" in window)) {
        setMessage("Browser ini belum mendukung notifikasi push.");
        return;
      }
      if (Notification.permission === "denied") {
        setMessage("Izin notifikasi diblokir di browser. Ubah izin Cartive melalui pengaturan situs browser.");
        return;
      }

      const oneSignal = await getOneSignalInstance();
      await oneSignal.setConsentGiven();
      await oneSignal.login(memberId);
      await oneSignal.User.PushSubscription.optIn();
      const subscribed = oneSignal.User.PushSubscription.optedIn === true;
      rememberOneSignalConsent(subscribed);
      setEnabled(subscribed);
      if (!subscribed) {
        await oneSignal.User.PushSubscription.optOut();
        await oneSignal.logout();
        await oneSignal.setConsentRequired();
      }
      setMessage(
        subscribed
          ? "Notifikasi status pesanan dan Fuel Card berhasil diaktifkan."
          : "Izin notifikasi belum diberikan. Kamu dapat mengubahnya di pengaturan situs browser.",
      );
    } catch (error) {
      console.error("OneSignal subscription could not be enabled.", error);
      setMessage("Notifikasi belum dapat diaktifkan. Coba lagi setelah memeriksa koneksi.");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage("");
    try {
      const oneSignal = await getOneSignalInstance();
      await oneSignal.User.PushSubscription.optOut();
      await oneSignal.logout();
      await oneSignal.setConsentRequired();
      rememberOneSignalConsent(false);
      setEnabled(false);
      setMessage("Persetujuan dan notifikasi push Cartive sudah dimatikan.");
    } catch (error) {
      console.error("OneSignal subscription could not be disabled.", error);
      setMessage("Notifikasi belum dapat dimatikan dari Cartive. Ubah izin melalui pengaturan situs browser.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verification-actions">
      <p className="verification-note">
        Notifikasi push hanya untuk status pesanan dan Fuel Card. Promosi tidak dikirim lewat push.
      </p>
      <button
        className="quiet-button"
        type="button"
        onClick={() => void (enabled ? disableNotifications() : enableNotifications())}
        disabled={busy}
      >
        {busy
          ? "Memperbarui notifikasi…"
          : enabled
            ? "Matikan notifikasi Cartive"
            : "Aktifkan notifikasi pesanan & stamp"}
      </button>
      {message && <p className="verification-note" role="status">{message}</p>}
    </div>
  );
}
