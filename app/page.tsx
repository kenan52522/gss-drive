"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeviceId } from "@/lib/utils/device";

type LicenseStatus =
  | "loading"
  | "no_request"
  | "pending"
  | "approved"
  | "active"
  | "rejected"
  | "blocked_device"
  | "error";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("kenan@gmail.com");
  const [status, setStatus] = useState<LicenseStatus>("loading");
  const [licenseKey, setLicenseKey] = useState("");
  const [message, setMessage] = useState("");

  async function checkLicense() {
    try {
      setStatus("loading");
      setMessage("");

      const deviceId = getDeviceId();

      const res = await fetch(
        `/api/license-check?email=${encodeURIComponent(email)}&device_id=${encodeURIComponent(deviceId)}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!data.ok) {
        setStatus("error");
        setMessage(data.error || "Bir hata oluştu.");
        return;
      }

      if (data.error === "Bu lisans başka bir cihazda kayıtlı.") {
        setStatus("blocked_device");
        setMessage(data.error);
        return;
      }

      if (data.hasActiveLicense) {
        setStatus("active");
        setLicenseKey(data.license?.license_key || "");

        setTimeout(() => {
          router.push("/route");
        }, 1200);

        return;
      }

      if (!data.request) {
        setStatus("no_request");
        return;
      }

      if (data.request.status === "pending") {
        setStatus("pending");
        return;
      }

      if (data.request.status === "approved") {
        setStatus("approved");
        return;
      }

      if (data.request.status === "rejected") {
        setStatus("rejected");
        return;
      }

      setStatus("error");
      setMessage("Durum okunamadı.");
    } catch (error) {
      setStatus("error");
      setMessage("Sunucuya bağlanılamadı.");
    }
  }

  useEffect(() => {
    checkLicense();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 420 }}>
        <h1>GSS Drive Lisans Kontrolü</h1>

        <div style={{ marginBottom: 16 }}>
          <label>E-posta</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          />
        </div>

        <button
          onClick={checkLicense}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          Yenile
        </button>

        {status === "loading" && <p>Kontrol ediliyor...</p>}

        {status === "no_request" && (
          <div>
            <p>Henüz lisans talebi bulunamadı.</p>
          </div>
        )}

        {status === "pending" && (
          <div>
            <p>
              <strong>Onay Bekleniyor</strong>
            </p>
            <p>{email}</p>
          </div>
        )}

        {status === "approved" && (
          <div>
            <p>
              <strong>Talep onaylandı.</strong>
            </p>
            <p>Lisans kaydı kontrol ediliyor. Yenile butonuna bas.</p>
          </div>
        )}

        {status === "active" && (
          <div>
            <p>
              <strong>Lisans Aktif</strong>
            </p>
            <p>{email}</p>
            <p>Lisans Anahtarı: {licenseKey}</p>
            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #22c55e",
                borderRadius: 8,
              }}
            >
              GSS Drive kullanımına hazırsınız. Ana uygulamaya yönlendiriliyorsunuz...
            </div>
          </div>
        )}

        {status === "blocked_device" && (
          <div>
            <p>
              <strong>Cihaz Engeli</strong>
            </p>
            <p>{message}</p>
          </div>
        )}

        {status === "rejected" && (
          <div>
            <p>
              <strong>Lisans talebi reddedildi.</strong>
            </p>
          </div>
        )}

        {status === "error" && (
          <div>
            <p>
              <strong>Hata:</strong> {message}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}