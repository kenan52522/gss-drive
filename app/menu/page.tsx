"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MenuPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const isLicensed = localStorage.getItem("gss_license_ok") === "true";
    const savedEmail = localStorage.getItem("gss_license_email") || "";

    if (!isLicensed) {
      router.replace("/");
      return;
    }

    setEmail(savedEmail);
    setReady(true);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("gss_license_ok");
    localStorage.removeItem("gss_license_email");
    router.replace("/");
  }

  if (!ready) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#ffffff",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>GSS Drive Menü</h1>

        <p style={{ color: "#aeb8d0", marginBottom: 24 }}>
          Aktif kullanıcı: {email}
        </p>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#11182d",
              border: "1px solid #26304d",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ marginBottom: 10, fontSize: 22 }}>Canlı Rota</h2>

            <p style={{ color: "#aeb8d0", marginBottom: 16 }}>
              Rota takibi, konum bazlı uyarılar ve sürüş destek ekranı.
            </p>

            <button
              onClick={() => router.push("/route")}
              style={{
                height: 46,
                padding: "0 18px",
                borderRadius: 12,
                border: "none",
                background: "#22c55e",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Canlı Rota’ya Git
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: 160,
              height: 44,
              borderRadius: 12,
              border: "1px solid #3b4b73",
              background: "transparent",
              color: "#ffffff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </main>
  );
}