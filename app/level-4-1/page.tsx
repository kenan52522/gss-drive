"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { findDistrictId } from "@/lib/district-map";

type OverlayPointType = "radar" | "control" | "corridor_start" | "corridor_end";

type OverlayPoint = {
  id: string;
  type: OverlayPointType;
  title: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
};

type OverlayResponse = {
  success: boolean;
  overlayPoints: OverlayPoint[];
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
    initKenLevel41Map?: () => void;
  }
}

const DEFAULT_CENTER = {
  lat: 41.2867,
  lng: 36.33,
};

const MAP_ID = "ken-level-4-1-map";

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

  // Çok genel girişler için kontrollü varsayım
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

export default function Level41Page() {
  const mapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [from, setFrom] = useState("Samsun");
  const [to, setTo] = useState("Ordu Fatsa Migros");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    radar: 0,
    control: 0,
    corridorStart: 0,
    corridorEnd: 0,
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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    window.initKenLevel41Map = () => {
      if (!window.google) return;

      const map = new window.google.maps.Map(document.getElementById(MAP_ID), {
        center: DEFAULT_CENTER,
        zoom: 8,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#2563eb",
          strokeWeight: 6,
          strokeOpacity: 0.85,
        },
      });

      mapRef.current = map;
      directionsRendererRef.current = directionsRenderer;
      infoWindowRef.current = new window.google.maps.InfoWindow();

      setMapReady(true);
    };

    return () => {
      window.initKenLevel41Map = undefined;
    };
  }, []);

  function clearMarkers() {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }

  function getMarkerColor(type: OverlayPointType) {
    if (type === "radar") {
      return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
    }
    if (type === "control") {
      return "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
    }
    if (type === "corridor_start") {
      return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
    }
    return "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
  }

  function getTypeLabel(type: OverlayPointType) {
    if (type === "radar") return "Radar";
    if (type === "control") return "Kontrol Noktası";
    if (type === "corridor_start") return "Hız Koridoru Başlangıcı";
    return "Hız Koridoru Bitişi";
  }

  function addOverlayMarkers(points: OverlayPoint[]) {
    if (!mapRef.current || !window.google) return;

    clearMarkers();

    points.forEach((point) => {
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat: point.lat, lng: point.lng },
        title: point.title,
        icon: {
          url: getMarkerColor(point.type),
        },
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;

        infoWindowRef.current.setContent(`
          <div style="min-width:220px;padding:6px 4px;">
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;">
              ${point.title}
            </div>
            <div style="margin-bottom:4px;">
              Tür: ${getTypeLabel(point.type)}
            </div>
            <div style="margin-bottom:4px;">
              İl: ${point.city ?? "-"}
            </div>
            <div style="margin-bottom:4px;">
              İlçe: ${point.district ?? "-"}
            </div>
            <div>
              Koordinat: ${point.lat}, ${point.lng}
            </div>
          </div>
        `);

        infoWindowRef.current.open({
          anchor: marker,
          map: mapRef.current,
        });
      });

      markersRef.current.push(marker);
    });
  }

  async function calculateRoute() {
    if (!window.google || !mapRef.current || !directionsRendererRef.current) {
      alert("Harita henüz hazır değil.");
      return;
    }

    if (!from.trim() || !to.trim()) {
      alert("Başlangıç ve hedef alanlarını doldurun.");
      return;
    }

    setLoading(true);

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

      directionsRendererRef.current.setDirections(routeResult);

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
          "DistrictId bulunamadı. Giriş metninde ilçe adı kullan ya da district-map eşlemesini genişlet."
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

      addOverlayMarkers(overlayData.overlayPoints);
      setSummary(overlayData.summary);
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
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFrom(`${lat}, ${lng}`);

        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(12);

          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setMap(null);
          }

          currentLocationMarkerRef.current = new window.google.maps.Marker({
            map: mapRef.current,
            position: { lat, lng },
            title: "Mevcut Konum",
          });
        }
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
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initKenLevel41Map`}
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          <h1 className="mb-2 text-2xl font-bold">Ken App Level 4.1</h1>
          <p className="mb-6 text-sm text-gray-600">
            Google Maps rota hattı üzerine radar, kontrol noktası ve hız koridoru
            bindirme ekranı
          </p>

          <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Başlangıç</label>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Örn: Samsun Atakum veya Alaçam"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none"
              />
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Hedef</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Örn: Ordu Fatsa Migros"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={useCurrentLocation}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium"
              >
                Konumumu Kullan
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={calculateRoute}
                disabled={!mapReady || loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
              >
                {loading ? "Hesaplanıyor..." : "Rotayı Getir"}
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-gray-600">Radar</div>
              <div className="text-2xl font-bold">{summary.radar}</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-sm text-gray-600">Kontrol Noktası</div>
              <div className="text-2xl font-bold">{summary.control}</div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm text-gray-600">Koridor Başlangıcı</div>
              <div className="text-2xl font-bold">{summary.corridorStart}</div>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="text-sm text-gray-600">Koridor Bitişi</div>
              <div className="text-2xl font-bold">{summary.corridorEnd}</div>
            </div>
          </div>

          <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-semibold">Başlangıç çözümleme</div>
              <div className="text-sm text-gray-700">İl: {debugInfo.fromCity || "-"}</div>
              <div className="text-sm text-gray-700">İlçe: {debugInfo.fromDistrict || "-"}</div>
              <div className="text-sm text-gray-700">
                districtId: {debugInfo.fromDistrictId || "-"}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Adres: {debugInfo.fromAddress || "-"}
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold">Hedef çözümleme</div>
              <div className="text-sm text-gray-700">İl: {debugInfo.toCity || "-"}</div>
              <div className="text-sm text-gray-700">İlçe: {debugInfo.toDistrict || "-"}</div>
              <div className="text-sm text-gray-700">
                districtId: {debugInfo.toDistrictId || "-"}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Adres: {debugInfo.toAddress || "-"}
              </div>
            </div>
          </div>

          <div
            id={MAP_ID}
            className="h-[70vh] w-full rounded-2xl border border-gray-200"
          />
        </div>
      </div>
    </>
  );
}