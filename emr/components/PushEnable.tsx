"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/app/actions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushEnable() {
  const [mode, setMode] = useState<"hidden" | "ios" | "ask" | "busy">("hidden");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (window.sessionStorage.getItem("rm-push-hint") === "1") return;
    if (ios && !standalone) {
      setMode("ios");
      return;
    }
    if (!("Notification" in window) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    navigator.serviceWorker.register("/sw.js").catch(() => null);
    if (Notification.permission === "granted") {
      void subscribe();
      return;
    }
    setMode("ask");
  }, []);

  async function subscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !("serviceWorker" in navigator)) return;
    setMode("busy");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));
      await savePushSubscription(JSON.stringify(subscription));
    } catch {
      /* permission or subscribe can fail on unsupported browsers */
    }
    setMode("hidden");
  }

  function dismiss() {
    window.sessionStorage.setItem("rm-push-hint", "1");
    setMode("hidden");
  }

  if (mode === "hidden" || mode === "busy") return null;

  return (
    <div className="push-banner">
      {mode === "ios" ? (
        <p>
          On iPhone, tap <strong>Share → Add to Home Screen</strong>, open it from there, then turn on alerts so you get
          a ping when a patient is assigned.
        </p>
      ) : (
        <p>Turn on alerts to get a pop-up when a patient is assigned to you, even if this tab is closed.</p>
      )}
      <div className="push-banner-actions">
        {mode === "ask" ? (
          <button className="btn" type="button" onClick={() => void subscribe()}>
            Enable alerts
          </button>
        ) : null}
        <button className="btn btn-ghost" type="button" onClick={dismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
