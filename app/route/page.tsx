"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { findDistrictId } from "@/lib/district-map";
import { evaluateAlerts } from "@/lib/alert-engine";
import { AlertPoint, AlertState } from "@/lib/types";

type OverlayPointType = "radar" | "control" | "corridor_start";
type OverlayPointRawType =
  | "radar"
  | "control"
  | "corridor_start"
  | "corridor_end";

type OverlayPoint = {
  id: string;
  type: OverlayPointType;
  title: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
};

type OverlayPointRaw = {
  id: string;
  type: OverlayPointRawType;
  title: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
};

type OverlayResponse = {
  success: boolean;
  overlayPoints: OverlayPointRaw[];
  summary: {
    radar: number;
    control: number;
    corridorStart: number;
    corridorEnd: number;
  };
  error?: string;
};

type ResolvedDistrictInfo = {
  city: string;
  district: string;
  districtId: number | null;
};

declare global {
  interface Window {
    google: any;
  }
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

function guessDistrictFromText(text: string) {
  const normalized = normalizeText(text);

  if (normalized.includes("atakum")) return "Atakum";
  if (normalized.includes("ilkadim")) return "İlkadım";
  if (normalized.includes("canik")) return "Canik";
  if (normalized.includes("tekkekoy")) return "Tekkeköy";
  if (normalized.includes("carsamba")) return "Çarşamba";
  if (normalized.includes("bafra")) return "Bafra";
  if (normalized.includes("alacam")) return "Alaçam";
  if (normalized.includes("19 mayis")) return "19 Mayıs";
  if (normalized.includes("terme")) return "Terme";

  if (normalized.includes("fatsa")) return "Fatsa";
  if (normalized.includes("unye")) return "Ünye";
  if (normalized.includes("altinordu")) return "Altınordu";
  if (normalized.includes("ordu merkez")) return "Altınordu";

  return "";
}

function guessCityFromText(text: string) {
  const normalized = normalizeText(text);

  if (normalized.includes("samsun")) return "Samsun";
  if (normalized.includes("ordu")) return "Ordu";

  const district = guessDistrictFromText(text);

  if (
    [
      "Atakum",
      "İlkadım",
      "Canik",
      "Tekkeköy",
      "Çarşamba",
      "Bafra",
      "Alaçam",
      "19 Mayıs",
      "Terme",
    ].includes(district)
  ) {
    return "Samsun";
  }

  if (["Fatsa", "Ünye", "Altınordu"].includes(district)) {
    return "Ordu";
  }

  return "";
}

function resolveDistrictWithoutGeocoder(
  rawInputText: string,
  routeAddressText: string,
  fallbackCity = "",
  fallbackDistrict = ""
): ResolvedDistrictInfo {
  const mergedText = `${rawInputText} ${routeAddressText}`.trim();

  let city = guessCityFromText(mergedText);
  let district = guessDistrictFromText(mergedText);

  if (!city && fallbackCity) city = fallbackCity;
  if (!district && fallbackDistrict) district = fallbackDistrict;

  if (!district) {
    const normalized = normalizeText(rawInputText);

    if (normalized === "samsun") district = "Atakum";
    if (normalized === "ordu") district = "Altınordu";
  }

  if (!city) {
    if (
      [
        "Atakum",
        "İlkadım",
        "Canik",
        "Tekkeköy",
        "Çarşamba",
        "Bafra",
        "Alaçam",
        "19 Mayıs",
        "Terme",
      ].includes(district)
    ) {
      city = "Samsun";
    }

    if (["Fatsa", "Ünye", "Altınordu"].includes(district)) {
      city = "Ordu";
    }
  }

  const districtId = findDistrictId(city, district);

  return {
    city,
    district,
    districtId,
  };
}

function isValidOverlayType(type: OverlayPointRawType): type is OverlayPointType {
  return (
    type === "radar" || type === "control" || type === "corridor_start"
  );
}

function convertOverlayToAlertPoints(points: OverlayPoint[]): AlertPoint[] {
  return points.map((point) => ({
    id: point.id,
    type:
      point.type === "radar"
        ? "radar"
        : point.type === "control"
        ? "control"
        : "corridorStart",
    title: point.title,
    lat: point.lat,
    lng: point.lng,
    raw: point,
  }));
}

export default function RoutePage() {
  const router = useRouter();

  const watchIdRef = useRef<number | null>(null);
  const lastWarningPlayAtRef = useRef(0);
  const routeReadyAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);

  const [licenseReady, setLicenseReady] = useState(false);
  const [licensedEmail, setLicensedEmail] = useState("");

  const [googleReady, setGoogleReady] = useState(false);
  const [from, setFrom] = useState("Samsun");
  const [to, setTo] = useState("Ordu Fatsa Migros");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState({
    radar: 0,
    control: 0,
    corridorStart: 0,
  });

  const [debugInfo, setDebugInfo] = useState({
    fromCity: "",
    fromDistrict: "",
    fromDistrictId: "",
    toCity: "",
    toDistrict: "",
    toDistrictId: "",
    fromAddress: "",
    toAddress: "",
  });

  const [overlayPointsState, setOverlayPointsState] = useState<OverlayPoint[]>([]);
  const [tracking, setTracking] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [lastAlerts, setLastAlerts] = useState<string[]>([]);
  const [alertStates, setAlertStates] = useState<Record<string, AlertState>>({});
  const [nearestList, setNearestList] = useState<
    Array<{
      id: string;
      title: string;
      type: AlertPoint["type"];
      distance: number;
    }>
  >([]);
  const [audioStatus, setAudioStatus] = useState("Hazır değil");
  const [triggeredCorridorIds, setTriggeredCorridorIds] = useState<Set<string>>(
    new Set()
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const alertPoints = useMemo(() => {
    return convertOverlayToAlertPoints(overlayPointsState);
  }, [overlayPointsState]);

  useEffect(() => {
    const isLicensed = localStorage.getItem("gss_license_ok") === "true";
    const savedEmail = localStorage.getItem("gss_license_email") || "";

    if (!isLicensed) {
      router.replace("/");
      return;
    }

    setLicensedEmail(savedEmail);
    setLicenseReady(true);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkGoogle = window.setInterval(() => {
      if (window.google?.maps?.DirectionsService) {
        setGoogleReady(true);
        window.clearInterval(checkGoogle);
      }
    }, 300);

    return () => window.clearInterval(checkGoogle);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function stopTracking() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }

  async function playRouteReadySound() {
    const audio = routeReadyAudioRef.current;

    if (!audio) {
      setAudioStatus("Rota sesi bulunamadı");
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      setAudioStatus("Rota sesi çalıyor");
    } catch (error) {
      console.error("Rota sesi çalma hatası:", error);
      setAudioStatus("Rota sesi hatası");
    }
  }

  async function playWarningSound(force = false) {
    const audio = warningAudioRef.current;

    if (!audio) {
      setAudioStatus("Uyarı sesi bulunamadı");
      return;
    }

    const now = Date.now();

    if (!force && now - lastWarningPlayAtRef.current < 1200) {
      return;
    }

    lastWarningPlayAtRef.current = now;

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      setAudioStatus("Uyarı sesi çalıyor");
    } catch (error) {
      console.error("Uyarı sesi çalma hatası:", error);
      setAudioStatus("Uyarı sesi hatası");
    }
  }

  async function testRouteSound() {
    await playRouteReadySound();
  }

  async function testWarningSound() {
    await playWarningSound(true);
  }

  async function startTracking() {
    setTrackingError("");

    if (!overlayPointsState.length) {
      setTrackingError("Önce rota verisini getirmeniz gerekiyor.");
      return;
    }

    if (!navigator.geolocation) {
      setTrackingError("Tarayıcı canlı konum özelliğini desteklemiyor.");
      return;
    }

    await playWarningSound(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCurrentPos({ lat, lng });

        setAlertStates((prev) => {
          const result = evaluateAlerts(lat, lng, alertPoints, prev);

          setNearestList(result.nearest);

          if (result.triggered.length > 0) {
            const filteredTriggered: string[] = [];

            for (const alertText of result.triggered) {
              const matchedPoint = result.nearest.find(
                (item) => item.title === alertText
              );

              if (!matchedPoint) {
                filteredTriggered.push(alertText);
                continue;
              }

              const point = alertPoints.find((p) => p.id === matchedPoint.id);

              if (!point) {
                filteredTriggered.push(alertText);
                continue;
              }

              if (point.type === "corridorStart") {
                if (triggeredCorridorIds.has(point.id)) {
                  continue;
                }
                filteredTriggered.push(alertText);
              } else {
                filteredTriggered.push(alertText);
              }
            }

            if (filteredTriggered.length > 0) {
              setLastAlerts(filteredTriggered);

              const newCorridorIds = new Set(triggeredCorridorIds);

              for (const alertText of filteredTriggered) {
                const matchedPoint = result.nearest.find(
                  (item) => item.title === alertText
                );

                if (!matchedPoint) continue;

                const point = alertPoints.find((p) => p.id === matchedPoint.id);

                if (point?.type === "corridorStart") {
                  newCorridorIds.add(point.id);
                }
              }

              setTriggeredCorridorIds(newCorridorIds);

              playWarningSound().catch((error) => {
                console.error("Uyarı sesi hatası:", error);
              });
            }
          }

          return result.states;
        });
      },
      (error) => {
        console.error(error);
        setTrackingError("Canlı konum alınamadı.");
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;
    setTracking(true);
  }

  async function calculateRoute() {
    await playRouteReadySound();

    if (!window.google?.maps?.DirectionsService) {
      alert("Google yön tarifi servisi henüz hazır değil.");
      return;
    }

    if (!from.trim() || !to.trim()) {
      alert("Başlangıç ve hedef alanlarını doldurun.");
      return;
    }

    setLoading(true);
    setTrackingError("");
    setLastAlerts([]);
    setNearestList([]);
    setAlertStates({});
    setTriggeredCorridorIds(new Set());
    stopTracking();

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const routeResult = await directionsService.route({
        origin: from,
        destination: to,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess",
        },
      });

      const leg = routeResult?.routes?.[0]?.legs?.[0];

      if (!leg) {
        throw new Error("Rota bacağı bulunamadı.");
      }

      const fromLatitude = leg.start_location.lat();
      const fromLongitude = leg.start_location.lng();
      const toLatitude = leg.end_location.lat();
      const toLongitude = leg.end_location.lng();

      const startAddress = leg.start_address || "";
      const endAddress = leg.end_address || "";

      const fromResolved = resolveDistrictWithoutGeocoder(
        from,
        startAddress,
        "Samsun",
        ""
      );

      const toResolved = resolveDistrictWithoutGeocoder(
        to,
        endAddress,
        "Ordu",
        ""
      );

      setDebugInfo({
        fromCity: fromResolved.city || "-",
        fromDistrict: fromResolved.district || "-",
        fromDistrictId: fromResolved.districtId
          ? String(fromResolved.districtId)
          : "Bulunamadı",
        toCity: toResolved.city || "-",
        toDistrict: toResolved.district || "-",
        toDistrictId: toResolved.districtId
          ? String(toResolved.districtId)
          : "Bulunamadı",
        fromAddress: startAddress || "-",
        toAddress: endAddress || "-",
      });

      if (!fromResolved.districtId || !toResolved.districtId) {
        throw new Error(
          "districtId bulunamadı. Giriş metninde ilçe adı kullan ya da district-map eşlemesini genişlet."
        );
      }

      const overlayRes = await fetch("/api/route-overlay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          fromLatitude,
          fromLongitude,
          toLatitude,
          toLongitude,
          fromDistrictId: fromResolved.districtId,
          toDistrictId: toResolved.districtId,
        }),
      });

      const overlayData: OverlayResponse = await overlayRes.json();

      if (!overlayRes.ok || !overlayData.success) {
        throw new Error(overlayData.error || "Overlay verisi alınamadı.");
      }

      const cleanedOverlayPoints: OverlayPoint[] = [];

      for (const point of overlayData.overlayPoints) {
        if (!isValidOverlayType(point.type)) continue;

        cleanedOverlayPoints.push({
          id: point.id,
          type: point.type,
          title: point.title,
          lat: point.lat,
          lng: point.lng,
          city: point.city,
          district: point.district,
        });
      }

      setOverlayPointsState(cleanedOverlayPoints);
      setSummary({
        radar: overlayData.summary.radar,
        control: overlayData.summary.control,
        corridorStart: overlayData.summary.corridorStart,
      });
      setAudioStatus("Hazır");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Rota oluşturulurken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Tarayıcı konum özelliğini desteklemiyor.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFrom(`${lat}, ${lng}`);
        setCurrentPos({ lat, lng });
      },
      (error) => {
        console.error(error);
        alert("Konum alınamadı.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  if (!licenseReady) {
    return null;
  }

  if (!apiKey) {
    return (
      <div className="p-6 text-red-600">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY tanımlı değil.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Canlı Rota</h1>
              <p className="mb-1 text-sm text-slate-300">
                Lisanslı kullanıcı: {licensedEmail}
              </p>
              <p className="text-sm text-slate-400">
                Rota sesi ve uyarı sesi ayrılmış sürüm
              </p>
            </div>

            <button
              onClick={() => router.push("/menu")}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white"
            >
              Menüye Dön
            </button>
          </div>

          <audio ref={routeReadyAudioRef} preload="auto" hidden>
            <source src="/sounds/route-ready.mp3" type="audio/mpeg" />
          </audio>

          <audio ref={warningAudioRef} preload="auto" hidden>
            <source src="/sounds/warning-500m.mp3" type="audio/mpeg" />
          </audio>

          <div className="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Başlangıç</label>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Örnek: Samsun Atakum"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Hedef</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Örnek: Ordu Fatsa Migros"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={useCurrentLocation}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-medium"
              >
                Konumumu Kullan
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={calculateRoute}
                disabled={!googleReady || loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
              >
                {loading ? "Hesaplanıyor..." : "Rotayı Getir"}
              </button>
            </div>

            <div className="flex items-end">
              {!tracking ? (
                <button
                  onClick={startTracking}
                  className="w-full rounded-xl bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-60"
                  disabled={!overlayPointsState.length}
                >
                  Takibi Başlat
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="w-full rounded-xl bg-red-600 px-4 py-2 font-medium text-white"
                >
                  Takibi Durdur
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <button
              onClick={testRouteSound}
              className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100"
            >
              Rota Sesini Test Et
            </button>

            <button
              onClick={testWarningSound}
              className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-100"
            >
              Uyarı Sesini Test Et
            </button>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
              Ses durumu: <span className="font-semibold text-white">{audioStatus}</span>
            </div>
          </div>

          {!googleReady ? (
            <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              Google yön tarifi servisi yükleniyor...
            </div>
          ) : null}

          {trackingError ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {trackingError}
            </div>
          ) : null}

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm text-slate-300">Radar</div>
              <div className="text-2xl font-bold">{summary.radar}</div>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="text-sm text-slate-300">Kontrol noktası</div>
              <div className="text-2xl font-bold">{summary.control}</div>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="text-sm text-slate-300">Koridor başlangıcı</div>
              <div className="text-2xl font-bold">{summary.corridorStart}</div>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 text-sm font-semibold">Canlı konum</div>
              {currentPos ? (
                <>
                  <div className="text-sm text-slate-300">Enlem: {currentPos.lat}</div>
                  <div className="text-sm text-slate-300">Boylam: {currentPos.lng}</div>
                </>
              ) : (
                <div className="text-sm text-slate-400">Henüz canlı konum alınmadı.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 text-sm font-semibold">Son uyarılar</div>
              {lastAlerts.length > 0 ? (
                <div className="space-y-2">
                  {lastAlerts.map((alert, index) => (
                    <div
                      key={`${alert}-${index}`}
                      className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">Henüz uyarı oluşmadı.</div>
              )}
            </div>
          </div>

          <div className="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-semibold">Başlangıç çözümleme</div>
              <div className="text-sm text-slate-300">İl: {debugInfo.fromCity || "-"}</div>
              <div className="text-sm text-slate-300">İlçe: {debugInfo.fromDistrict || "-"}</div>
              <div className="text-sm text-slate-300">
                districtId: {debugInfo.fromDistrictId || "-"}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Adres: {debugInfo.fromAddress || "-"}
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold">Hedef çözümleme</div>
              <div className="text-sm text-slate-300">İl: {debugInfo.toCity || "-"}</div>
              <div className="text-sm text-slate-300">İlçe: {debugInfo.toDistrict || "-"}</div>
              <div className="text-sm text-slate-300">
                districtId: {debugInfo.toDistrictId || "-"}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Adres: {debugInfo.toAddress || "-"}
              </div>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 text-sm font-semibold">En yakın noktalar</div>
              {nearestList.length > 0 ? (
                <div className="space-y-2">
                  {nearestList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-3"
                    >
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-slate-400">
                        Tür: {item.type} • Mesafe: {Math.round(item.distance)} metre
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Yakın nokta listesi henüz oluşmadı.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 text-sm font-semibold">Uyarı mantığı</div>
              <div className="space-y-1 text-sm text-slate-300">
                <div>• Radar: 500 metre kala uyarı</div>
                <div>• Kontrol noktası: 500 metre kala uyarı</div>
                <div>• Hız koridoru başlangıcı: 500 metre kala tek uyarı</div>
                <div>• Aynı koridorda tekrar uyarı yok</div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
                Takip edilen toplam nokta: {overlayPointsState.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}