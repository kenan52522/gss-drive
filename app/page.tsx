"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    try {
      setLoading(true);
      setMessage("");

      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        setMessage("Lütfen e-posta adresinizi girin.");
        return;
      }

      const res = await fetch(
        "/api/license/check?email=" + encodeURIComponent(cleanEmail)
      );

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setMessage(data?.message || "Lisans bulunamadı.");
        return;
      }

      localStorage.setItem("gss_license_ok", "true");
      localStorage.setItem("gss_license_email", cleanEmail);

      router.push("/menu");
    } catch (err) {
      console.error(err);
      setMessage("Sunucu hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1020",
      }}
    >
      <div
        style={{
          width: 360,
          padding: 24,
          borderRadius: 16,
          background: "#11182d",
          border: "1px solid #26304d",
        }}
      >
        <h1 style={{ color: "#fff", marginBottom: 10 }}>GSS Drive</h1>

        <input
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            height: 45,
            borderRadius: 10,
            border: "1px solid #33405f",
            padding: "0 10px",
            marginBottom: 10,
            background: "#0f1528",
            color: "#fff",
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            height: 45,
            borderRadius: 10,
            background: "#3b82f6",
            border: "none",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {loading ? "Kontrol ediliyor..." : "Giriş Yap"}
        </button>

        {message && (
          <p style={{ color: "red", marginTop: 10 }}>{message}</p>
        )}
      </div>
    </main>
  );
}