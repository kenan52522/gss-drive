"use client";

import { useEffect, useState } from "react";

type LicenseRequest = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
};

type LicenseItem = {
  id: string;
  license_key: string;
  email: string;
  full_name: string | null;
  status: string;
  plan: string;
  created_at?: string;
};

export default function AdminLicensesPage() {
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>("");
  const [newLicenseKey, setNewLicenseKey] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const [reqRes, licRes] = await Promise.all([
        fetch("/api/admin/licenses/requests", { cache: "no-store" }),
        fetch("/api/admin/licenses/list", { cache: "no-store" }),
      ]);

      const reqData = await reqRes.json();
      const licData = await licRes.json();

      if (reqData.ok) {
        setRequests(reqData.requests || []);
      }

      if (licData.ok) {
        setLicenses(licData.licenses || []);
      }
    } catch {
      setMessage("Veriler alınırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(requestId: string) {
    setBusyId(requestId);
    setMessage("");
    setNewLicenseKey("");

    try {
      const res = await fetch("/api/admin/licenses/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.error || "Onay işlemi başarısız.");
        return;
      }

      setNewLicenseKey(data.license_key || "");
      setMessage("Lisans başarıyla oluşturuldu.");
      await loadData();
    } catch {
      setMessage("Sunucuya bağlanırken hata oluştu.");
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const pendingRequests = requests.filter((item) => item.status === "pending");

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>GSS Drive Admin Paneli</h1>
        <p style={{ marginTop: 0, color: "#444" }}>
          Lisans taleplerini yönetin ve aktif lisansları görüntüleyin.
        </p>

        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <button
            onClick={loadData}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Yenile
          </button>
        </div>

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
            }}
          >
            {message}
          </div>
        )}

        {newLicenseKey && (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 10,
              border: "1px solid #22c55e",
              background: "#f0fdf4",
            }}
          >
            <strong>Oluşan lisans anahtarı:</strong>
            <div style={{ marginTop: 8, fontSize: 18 }}>{newLicenseKey}</div>
          </div>
        )}

        <section style={{ marginBottom: 36 }}>
          <h2>Onay Bekleyen Talepler</h2>

          {loading ? (
            <p>Yükleniyor...</p>
          ) : pendingRequests.length === 0 ? (
            <p>Bekleyen talep bulunmuyor.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {pendingRequests.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>E-posta:</strong> {item.email}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Ad Soyad:</strong> {item.full_name || "-"}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Durum:</strong> {item.status}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <strong>Tarih:</strong>{" "}
                    {new Date(item.created_at).toLocaleString("tr-TR")}
                  </div>

                  <button
                    onClick={() => approveRequest(item.id)}
                    disabled={busyId === item.id}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#111827",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {busyId === item.id ? "Onaylanıyor..." : "Onayla ve Lisans Oluştur"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2>Aktif Lisanslar</h2>

          {loading ? (
            <p>Yükleniyor...</p>
          ) : licenses.length === 0 ? (
            <p>Lisans kaydı bulunmuyor.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {licenses.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>Lisans Anahtarı:</strong> {item.license_key}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>E-posta:</strong> {item.email}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Ad Soyad:</strong> {item.full_name || "-"}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Durum:</strong> {item.status}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Paket:</strong> {item.plan}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}