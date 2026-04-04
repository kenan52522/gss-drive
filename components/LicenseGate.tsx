"use client";

import { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";

export default function LicenseGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");

  useEffect(() => {
    checkLicense();
  }, []);

  async function checkLicense() {
    const saved = await Preferences.get({ key: "gss_email" });

    if (!saved.value) {
      setStatus("new");
      return;
    }

    setSavedEmail(saved.value);

    try {
      const res = await fetch("/api/license-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: saved.value }),
      });

      const data = await res.json();

      if (data.status === "approved") {
        setStatus("approved");
      } else if (data.status === "blocked") {
        setStatus("blocked");
      } else {
        setStatus("pending");
      }
    } catch {
      setStatus("pending");
    }
  }

  async function sendRequest() {
    if (!email.includes("@")) return;

    try {
      await fetch("/api/license-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      await Preferences.set({ key: "gss_email", value: email });
      setSavedEmail(email);
      setStatus("pending");
    } catch {
      alert("Bağlantı hatası oluştu.");
    }
  }

  if (status === "approved") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <div style={{ padding: 20 }}>Kontrol ediliyor...</div>;
  }

  if (status === "pending") {
    return (
      <div style={{ padding: 20 }}>
        <h2>Onay Bekleniyor</h2>
        <p>{savedEmail}</p>
        <button onClick={checkLicense}>Yenile</button>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div style={{ padding: 20 }}>
        <h2>Erişim yok</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>GSS Drive Aktivasyon</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="mail gir"
      />
      <button onClick={sendRequest}>Gönder</button>
    </div>
  );
}