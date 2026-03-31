"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDistanceMeters } from "@/lib/geo";
import { speakAlert } from "@/lib/alerts";
import { normalizeRouteData, AlertPoint } from "@/lib/route-utils";

type LivePosition = {
  lat: number;
  lng: number;
};

type RouteSummary = {
  radarCount: number;
  controlPointCount: number;
  corridorCount: number;
};

type NormalizedSummary = {
  radar: number;
  control: number;
  corridorStart: number;
  corridorEnd: number;
};

const API_URL = "/api/route";

const cityMap: Record<
  string,
  {
    lat: number;
    lng: number;
    districtId?: number;
  }
> = {
  Samsun: { lat: 41.2867, lng: 36.33, districtId: 5501 },
  Ordu: { lat: 40.9839, lng: 37.8764, districtId: 5201 },
  Amasya: { lat: 40.6539, lng: 35.833, districtId: 501 },
  Çorum: { lat: 40.5506, lng: 34.9556, districtId: 1901 },
  Ankara: { lat: 39.9334, lng: 32.8597, districtId: 601 },
  İstanbul: { lat: 41.0082, lng: 28.9784, districtId: 3401 },
};

const cities = Object.keys(cityMap);

function typeLabel(type: AlertPoint["type"]) {
  if (type === "radar") return "Radar";
  if (type === "control") return "Kontrol";
  if (type === "corridor_start") return "Hız koridoru başlangıcı";
  if (type === "corridor_end") return "Hız koridoru bitişi";
  return type;
}

function extractPayload(data: any) {
  if (!data) return data;
  if (data?.radars || data?.controls || data?.corridors) return data;
  if (data?.data) return data.data;
  if (data?.result) return data.result;
  if (data?.routeData) return data.routeData;
  if (data?.payload) return data.payload;
  return data;
}

function parseCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getRouteSummary(payload: any): RouteSummary {
  return {
    radarCount: parseCount(payload?.radarCount),
    controlPointCount: parseCount(payload?.controlPointCount),
    corridorCount: parseCount(payload?.corridorCount),
  };
}

function getNormalizedSummary(points: AlertPoint[]): NormalizedSummary {
  return {
    radar: points.filter((p) => p.type === "radar").length,
    control: points.filter((p) => p.type === "control").length,
    corridorStart: points.filter((p) => p.type === "corridor_start").length,
    corridorEnd: points.filter((p) => p.type === "corridor_end").length,
  };
}

export default function Page() {
  const [from, setFrom] = useState("Samsun");
  const [to, setTo] = useState("Ordu");

  const [points, setPoints] = useState<AlertPoint[]>([]);
  const [livePosition, setLivePosition] = useState<LivePosition | null>(null);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [watching, setWatching] = useState(false);

  const [routeMessage, setRouteMessage] = useState("");
  const [alertText, setAlertText] = useState("");
  const [errorText, setErrorText] = useState("");

  const [routeSummary, setRouteSummary] = useState<RouteSummary>({
    radarCount: 0,
    controlPointCount: 0,
    corridorCount: 0,
  });

  const [normalizedSummary, setNormalizedSummary] = useState<NormalizedSummary>({
    radar: 0,
    control: 0,
    corridorStart: 0,
    corridorEnd: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  async function loadRoute() {
    setLoadingRoute(true);
    setErrorText("");
    setRouteMessage("");
    setAlertText("");
    setPoints([]);
    setRouteSummary({
      radarCount: 0,
      controlPointCount: 0,
      corridorCount: 0,
    });
    setNormalizedSummary({
      radar: 0,
      control: 0,
      corridorStart: 0,
      corridorEnd: 0,
    });
    alertedIdsRef.current = new Set();

    try {
      const fromData = cityMap[from];
      const toData = cityMap[to];

      if (!fromData || !toData) {
        throw new Error("Şehir bilgisi bulunamadı.");
      }

      const requestBody: Record<string, unknown> = {
        fromLatitude: fromData.lat,
        fromLongitude: fromData.lng,
        toLatitude: toData.lat,
        toLongitude: toData.lng,
      };

      if (fromData.districtId != null) {
        requestBody.fromDistrictId = fromData.districtId;
      }

      if (toData.districtId != null) {
        requestBody.toDistrictId = toData.districtId;
      }

      console.log("REQUEST BODY:", requestBody);

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      console.log("API DATA:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Rota verisi alınamadı.");
      }

      const payload = extractPayload(data);

      console.log("PAYLOAD:", payload);

      const normalized = normalizeRouteData(payload);

      console.log("NORMALIZED POINTS:", normalized);

      const summary = getRouteSummary(payload);
      const normalizedBreakdown = getNormalizedSummary(normalized);

      setRouteSummary(summary);
      setNormalizedSummary(normalizedBreakdown);
      setPoints(normalized);

      setRouteMessage(
        `${from} → ${to} için ${normalized.length} uyarı noktası yüklendi.`
      );
    } catch (error: any) {
      console.error("LOAD ROUTE ERROR:", error);
      setPoints([]);
      setRouteSummary({
        radarCount: 0,
        controlPointCount: 0,
        corridorCount: 0,
      });
      setNormalizedSummary({
        radar: 0,
        control: 0,
        corridorStart: 0,
        corridorEnd: 0,
      });
      setErrorText(error?.message || "Rota verisi alınamadı.");
    } finally {
      setLoadingRoute(false);
    }
  }

  function startTracking() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorText("Bu cihaz konum desteği sunmuyor.");
      return;
    }

    setErrorText("");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLivePosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setWatching(true);
      },
      (error) => {
        setWatching(false);

        if (error.code === 1) {
          setErrorText("Konum izni verilmedi.");
        } else if (error.code === 2) {
          setErrorText("Konum bilgisi alınamadı.");
        } else if (error.code === 3) {
          setErrorText("Konum alma işlemi zaman aşımına uğradı.");
        } else {
          setErrorText("Canlı konum başlatılamadı.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  }

  function stopTracking() {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setWatching(false);
  }

  useEffect(() => {
    return () => {
      if (
        watchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!livePosition || points.length === 0) return;

    const nearest = points
      .filter((point) => !alertedIdsRef.current.has(point.id))
      .map((point) => {
        const distance = getDistanceMeters(
          livePosition.lat,
          livePosition.lng,
          point.lat,
          point.lng
        );

        return { point, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearest) return;

    if (nearest.distance <= nearest.point.triggerDistance) {
      alertedIdsRef.current.add(nearest.point.id);

      const message = `${nearest.point.title} (${Math.round(
        nearest.distance
      )} m)`;

      setAlertText(message);
      speakAlert(message);
    }
  }, [livePosition, points]);

  const nearestPoints = useMemo(() => {
    if (!livePosition || points.length === 0) return [];

    return points
      .map((point) => ({
        ...point,
        distance: Math.round(
          getDistanceMeters(
            livePosition.lat,
            livePosition.lng,
            point.lat,
            point.lng
          )
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [livePosition, points, alertText]);

  return (
    <main className="min-h-screen bg-white p-5 text-black">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ken App Level 3 - Gerçek Veri</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Gerçek rota verisi ile radar, kontrol noktası ve hız koridoru uyarı
            sistemi
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border p-4">
          <h2 className="text-xl font-semibold">Rota seçimi</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">Başlangıç ili</label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border p-3"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Bitiş ili</label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border p-3"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadRoute}
              disabled={loadingRoute}
              className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-60"
            >
              {loadingRoute ? "Rota yükleniyor..." : "Gerçek rotayı yükle"}
            </button>

            <button
              onClick={startTracking}
              className="rounded-xl border px-4 py-3"
            >
              Canlı takibi başlat
            </button>

            <button
              onClick={stopTracking}
              className="rounded-xl border px-4 py-3"
            >
              Takibi durdur
            </button>
          </div>

          {routeMessage && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-800">
              {routeMessage}
            </div>
          )}

          {errorText && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
              {errorText}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-4 text-center">
            <div className="text-3xl font-bold text-red-600">
              {routeSummary.radarCount}
            </div>
            <div className="mt-2 text-base font-medium">Rotadaki radar</div>
          </div>

          <div className="rounded-2xl border p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {routeSummary.controlPointCount}
            </div>
            <div className="mt-2 text-base font-medium">
              Trafik kontrol noktası
            </div>
          </div>

          <div className="rounded-2xl border p-4 text-center">
            <div className="text-3xl font-bold text-violet-600">
              {routeSummary.corridorCount}
            </div>
            <div className="mt-2 text-base font-medium">Hız koridoru</div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <h2 className="mb-4 text-xl font-semibold">Sistemin yakaladığı dağılım</h2>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-3">
              <div className="text-sm text-neutral-600">Radar noktası</div>
              <div className="mt-1 text-2xl font-bold">
                {normalizedSummary.radar}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-sm text-neutral-600">
                Kontrol noktası
              </div>
              <div className="mt-1 text-2xl font-bold">
                {normalizedSummary.control}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-sm text-neutral-600">
                Koridor başlangıcı
              </div>
              <div className="mt-1 text-2xl font-bold">
                {normalizedSummary.corridorStart}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-sm text-neutral-600">
                Koridor bitişi
              </div>
              <div className="mt-1 text-2xl font-bold">
                {normalizedSummary.corridorEnd}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border p-4">
            <h2 className="text-xl font-semibold">Canlı durum</h2>

            <div className="text-sm">
              <strong>Takip durumu:</strong> {watching ? "Aktif" : "Pasif"}
            </div>

            <div className="text-sm">
              <strong>Yüklenen nokta sayısı:</strong> {points.length}
            </div>

            <div className="break-all text-sm">
              <strong>Konum:</strong>{" "}
              {livePosition
                ? `${livePosition.lat} / ${livePosition.lng}`
                : "Henüz alınmadı"}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border p-4">
            <h2 className="text-xl font-semibold">Anlık uyarı</h2>
            <div className="text-sm">
              {alertText || "Henüz uyarı oluşmadı."}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <h2 className="mb-4 text-xl font-semibold">En yakın noktalar</h2>

          {nearestPoints.length === 0 ? (
            <div className="text-sm text-neutral-600">
              Önce rota yükleyin ve canlı takibi başlatın.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {nearestPoints.map((point) => (
                <div key={point.id} className="rounded-xl border p-3">
                  <div className="font-semibold">{typeLabel(point.type)}</div>
                  <div className="mt-1 text-sm text-neutral-700">
                    {point.title}
                  </div>
                  <div className="mt-2 text-sm">
                    <strong>Mesafe:</strong> {point.distance} m
                  </div>
                  <div className="text-sm">
                    <strong>Tetik:</strong> {point.triggerDistance} m
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}