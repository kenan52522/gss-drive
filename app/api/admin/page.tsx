"use client";

import { useEffect, useState } from "react";

type LicenseItem = {
  email: string;
  status: string;
};

export default function AdminPage() {
  const [items, setItems] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/licenses");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Liste alınamadı:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(email: string, status: "pending" | "approved" | "blocked") {
    try {
      const res = await fetch("/api/admin/update-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Durum güncellenemedi.");
        return;
      }

      await loadItems();
    } catch (error) {
      console.error("Durum güncellenemedi:", error);
      alert("Durum güncellenemedi.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold">GSS Drive Admin Panel</h1>
        <p className="mb-6 text-sm text-slate-400">
          Lisans başvurularını buradan yönetebilirsin.
        </p>

        <div className="mb-4">
          <button
            onClick={loadItems}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium"
          >
            Listeyi Yenile
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            Yükleniyor...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            Henüz başvuru yok.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.email}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="mb-2 text-lg font-semibold">{item.email}</div>
                <div className="mb-4 text-sm text-slate-300">
                  Durum: <span className="font-bold text-white">{item.status}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStatus(item.email, "approved")}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium"
                  >
                    Onayla
                  </button>

                  <button
                    onClick={() => updateStatus(item.email, "pending")}
                    className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-medium"
                  >
                    Beklemeye Al
                  </button>

                  <button
                    onClick={() => updateStatus(item.email, "blocked")}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium"
                  >
                    Engelle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}