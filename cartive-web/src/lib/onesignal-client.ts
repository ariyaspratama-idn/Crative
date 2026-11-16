"use client";

type OneSignalInstance = {
  init(options: {
    appId: string;
    requiresUserPrivacyConsent: true;
    serviceWorkerPath: string;
    serviceWorkerParam: { scope: string };
    allowLocalhostAsSecureOrigin?: boolean;
    welcomeNotification: { disable: true };
  }): Promise<void>;
  setConsentGiven(): Promise<void>;
  setConsentRequired(): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  User: {
    PushSubscription: {
      optedIn: boolean | null;
      optIn(): Promise<void>;
      optOut(): Promise<void>;
    };
  };
};

type OneSignalDeferredCallback = (
  oneSignal: OneSignalInstance,
) => void | Promise<void>;

declare global {
  interface Window {
    OneSignalDeferred?: OneSignalDeferredCallback[];
    cartiveOneSignal?: Promise<OneSignalInstance>;
  }
}

const consentStorageKey = (appId: string) => `cartive-onesignal-consent:${appId}`;

export function hasOneSignalConsent() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  return Boolean(
    appId &&
      typeof window !== "undefined" &&
      window.localStorage.getItem(consentStorageKey(appId)) === "granted",
  );
}

export function rememberOneSignalConsent(granted: boolean) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  if (!appId || typeof window === "undefined") return;
  const key = consentStorageKey(appId);
  if (granted) window.localStorage.setItem(key, "granted");
  else window.localStorage.removeItem(key);
}

export function getOneSignalInstance() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  if (!appId) {
    return Promise.reject(new Error("Notifikasi belum dikonfigurasi untuk lingkungan ini."));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Notifikasi hanya tersedia di browser."));
  }
  if (window.cartiveOneSignal) return window.cartiveOneSignal;

  const initialization = new Promise<OneSignalInstance>((resolve, reject) => {
    window.OneSignalDeferred ??= [];
    const timeout = window.setTimeout(
      () => reject(new Error("OneSignal SDK tidak merespons.")),
      15000,
    );
    window.OneSignalDeferred.push(async (oneSignal) => {
      try {
        await oneSignal.init({
          appId,
          requiresUserPrivacyConsent: true,
          serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
          ...(process.env.NODE_ENV === "development"
            ? { allowLocalhostAsSecureOrigin: true }
            : {}),
          welcomeNotification: { disable: true },
        });
        window.clearTimeout(timeout);
        resolve(oneSignal);
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    });

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-cartive-onesignal="true"]',
    );
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async = true;
    script.dataset.cartiveOnesignal = "true";
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("OneSignal SDK gagal dimuat."));
    };
    document.head.appendChild(script);
  });

  window.cartiveOneSignal = initialization;
  void initialization.catch(() => {
    if (window.cartiveOneSignal === initialization) {
      delete window.cartiveOneSignal;
    }
  });
  return initialization;
}

export async function unlinkOneSignalMember() {
  if (typeof window === "undefined" || !window.cartiveOneSignal) return;
  const oneSignal = await window.cartiveOneSignal;
  await oneSignal.logout();
}
