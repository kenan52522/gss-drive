"use client";

import { useMemo, useState } from "react";
import GoogleRouteMap from "../components/GoogleRouteMap";

type Point = {
  lat: number;
  lng: number;
  title?: string;
};

type CorridorPoint = {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  title?: string;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  radarCount?: number;
  controlPointCount?: number;
  corridorCount?: number;
  riskScore?: number;
  radarPoints?: Point[];
  controlPoints?: Point[];
  corridorPoints?: CorridorPoint[];
};

type CityOption = {
  name: string;
  lat: number;
  lng: number;
};

const CITIES: CityOption[] = [
  { name: "Samsun", lat: 41.2867, lng: 36.33 },
  { name: "Ordu", lat: 40.9847, lng: 37.8789 },
  { name: "Amasya", lat: 40.6539, lng: 35.8333 },
  { name: "Çorum", lat: 40.5506, lng: 34.9556 },
  { name: "Ankara", lat: 39.9334, lng: 32.8597 },
  { name: "İstanbul", lat: 41.0082, lng: 28.9784 },
];

function findCityByName(cityName: string): CityOption {
  return CITIES.find((city) => city.name === cityName) || CITIES[0];
}

export default function Page() {
  const [from, setFrom] = useState("Samsun");
  const [to, setTo] = useState("Ordu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<ApiResponse>({
    radarCount: 0,
    controlPointCount: 0,
    corridorCount: 0,
    riskScore: 0,
    radarPoints: [],
    controlPoints: [],
    corridorPoints: [],
  });

  async function handleCalculate() {
    setLoading(true);
    setError("");

    try {
      const fromCity = findCityByName(from);
      const toCity = findCityByName(to);

      const res = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromLatitude: fromCity.lat,
          fromLongitude: fromCity.lng,
          toLatitude: toCity.lat,
          toLongitude: toCity.lng,
        }),
      });

      const json: ApiResponse = await res.json();

      if (!res.ok || json.success === false) {
        setError(json.error || "Rota verisi alınamadı.");
        setData({
          radarCount: 0,
          controlPointCount: 0,
          corridorCount: 0,
          riskScore: 0,
          radarPoints: [],
          controlPoints: [],
          corridorPoints: [],
        });
        return;
      }

      setData({
        radarCount: json.radarCount || 0,
        controlPointCount: json.controlPointCount || 0,
        corridorCount: json.corridorCount || 0,
        riskScore: json.riskScore || 0,
        radarPoints: json.radarPoints || [],
        controlPoints: json.controlPoints || [],
        corridorPoints: json.corridorPoints || [],
      });
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";

      setError(message);

      setData({
        radarCount: 0,
        controlPointCount: 0,
        corridorCount: 0,
        riskScore: 0,
        radarPoints: [],
        controlPoints: [],
        corridorPoints: [],
      });
    } finally {
      setLoading(false);
    }
  }

  const overlayData = useMemo(() => {
    return {
      radarPoints: data.radarPoints || [],
      controlPoints: data.controlPoints || [],
      corridorPoints: data.corridorPoints || [],
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ken App Level 4
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Google Maps entegrasyonu ile rota, radar, kontrol noktaları ve hız
            koridorlarını harita üzerinde görselleştirme ekranı
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Başlangıç</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none"
            >
              {CITIES.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Bitiş</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none"
            >
              {CITIES.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={loading || from === to}
              className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Hesaplanıyor..." : "Rotayı Getir"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm text-neutral-500">Radar</div>
            <div className="mt-2 text-3xl font-bold">
              {data.radarCount || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm text-neutral-500">Kontrol Noktası</div>
            <div className="mt-2 text-3xl font-bold">
              {data.controlPointCount || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm text-neutral-500">Hız Koridoru</div>
            <div className="mt-2 text-3xl font-bold">
              {data.corridorCount || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm text-neutral-500">Risk Skoru</div>
            <div className="mt-2 text-3xl font-bold">
              %{data.riskScore || 0}
            </div>
          </div>
        </div>

        <GoogleRouteMap from={from} to={to} overlayData={overlayData} />
      </div>
    </main>
  );
}