"use client";

import { useMemo, useState } from "react";

type DistrictItem = {
  name: string;
  districtId: number;
  latitude: number;
  longitude: number;
};

type CityMap = {
  [cityName: string]: DistrictItem[];
};

type RouteResult = {
  fromDistrict: string;
  toDistrict: string;
  radarCount: number;
  controlPointCount: number;
  corridorCount: number;
  cities: unknown[];
  speedTunnels: unknown[];
  routeCoordinates: unknown[];
};

type RouteApiResponse = {
  success: boolean;
  data?: RouteResult;
  raw?: {
    data?: {
      RadarCount?: number;
      ControlPointCount?: number;
      CorridorCount?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  error?: string;
};

const cityDistricts: CityMap = {
  Samsun: [
    {
      name: "İlkadım",
      districtId: 2074,
      latitude: 41.289284,
      longitude: 36.328644,
    },
    {
      name: "Atakum",
      districtId: 999001,
      latitude: 41.3473,
      longitude: 36.2304,
    },
  ],
  Ordu: [
    {
      name: "Altınordu",
      districtId: 2103,
      latitude: 40.986166,
      longitude: 37.879721,
    },
    {
      name: "Fatsa",
      districtId: 999002,
      latitude: 41.0274,
      longitude: 37.5019,
    },
  ],
};

export default function Page() {
  const cities = Object.keys(cityDistricts);

  const [fromCity, setFromCity] = useState("Samsun");
  const [toCity, setToCity] = useState("Ordu");
  const [fromDistrictName, setFromDistrictName] = useState("İlkadım");
  const [toDistrictName, setToDistrictName] = useState("Altınordu");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteApiResponse | null>(null);
  const [debugPayload, setDebugPayload] = useState<Record<string, unknown> | null>(null);

  const fromDistricts = useMemo(() => cityDistricts[fromCity] || [], [fromCity]);
  const toDistricts = useMemo(() => cityDistricts[toCity] || [], [toCity]);

  const selectedFromDistrict = fromDistricts.find((d) => d.name === fromDistrictName);
  const selectedToDistrict = toDistricts.find((d) => d.name === toDistrictName);

  function handleFromCityChange(city: string) {
    setFromCity(city);
    const firstDistrict = cityDistricts[city]?.[0];
    setFromDistrictName(firstDistrict?.name || "");
  }

  function handleToCityChange(city: string) {
    setToCity(city);
    const firstDistrict = cityDistricts[city]?.[0];
    setToDistrictName(firstDistrict?.name || "");
  }

  async function calculateRoute() {
    if (!selectedFromDistrict || !selectedToDistrict) {
      setResult({
        success: false,
        error: "Başlangıç veya varış ilçesi bulunamadı.",
      });
      return;
    }

    const payload = {
      fromLatitude: selectedFromDistrict.latitude,
      fromLongitude: selectedFromDistrict.longitude,
      toLatitude: selectedToDistrict.latitude,
      toLongitude: selectedToDistrict.longitude,
      fromDistrictId: selectedFromDistrict.districtId,
      toDistrictId: selectedToDistrict.districtId,
    };

    setDebugPayload(payload);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: RouteApiResponse = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata oluştu.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Ken App</h1>
      <p style={{ marginBottom: 24 }}>
        İller arası radar, kontrol noktası ve hız koridoru farkındalık ekranı
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Başlangıç</h2>

          <label style={{ display: "block", marginBottom: 8 }}>İl</label>
          <select
            value={fromCity}
            onChange={(e) => handleFromCityChange(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: 8 }}>İlçe</label>
          <select
            value={fromDistrictName}
            onChange={(e) => setFromDistrictName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            {fromDistricts.map((district) => (
              <option key={`${fromCity}-${district.districtId}`} value={district.name}>
                {district.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Varış</h2>

          <label style={{ display: "block", marginBottom: 8 }}>İl</label>
          <select
            value={toCity}
            onChange={(e) => handleToCityChange(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: 8 }}>İlçe</label>
          <select
            value={toDistrictName}
            onChange={(e) => setToDistrictName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            {toDistricts.map((district) => (
              <option key={`${toCity}-${district.districtId}`} value={district.name}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={calculateRoute}
        disabled={loading}
        style={{
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",
          background: "#111827",
          color: "#fff",
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        {loading ? "Sorgulanıyor..." : "Rotayı Hesapla"}
      </button>

      {debugPayload && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Gönderilen Payload</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(debugPayload, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ marginBottom: 12 }}>Sonuç</h3>

          {!result.success ? (
            <p style={{ color: "crimson" }}>{result.error || "İstek başarısız oldu."}</p>
          ) : (
            <>
              <p>
                <strong>Başlangıç:</strong> {result.data?.fromDistrict || "-"}
              </p>
              <p>
                <strong>Varış:</strong> {result.data?.toDistrict || "-"}
              </p>
              <p>
                <strong>Radar Noktası:</strong> {result.data?.radarCount ?? 0}
              </p>
              <p>
                <strong>Kontrol Noktası:</strong> {result.data?.controlPointCount ?? 0}
              </p>
              <p>
                <strong>Hız Koridoru:</strong> {result.data?.corridorCount ?? 0}
              </p>
              <p>
                <strong>Not:</strong> Radar ve kontrol için toplam sayı, hız koridoru için toplam +
                geometri mantığı kullanılacak.
              </p>

              <div style={{ marginTop: 16 }}>
                <h4>Ham Total Kontrol</h4>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(
                    {
                      normalizedRadar: result.data?.radarCount,
                      normalizedControl: result.data?.controlPointCount,
                      normalizedCorridor: result.data?.corridorCount,
                      rawRadarCount: result.raw?.data?.RadarCount,
                      rawControlPointCount: result.raw?.data?.ControlPointCount,
                      rawCorridorCount: result.raw?.data?.CorridorCount,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4>Şehir Özeti</h4>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(result.data?.cities ?? [], null, 2)}
                </pre>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4>Hız Koridoru Detayları</h4>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(result.data?.speedTunnels ?? [], null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}