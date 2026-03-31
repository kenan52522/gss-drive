"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

type LatLngPoint = {
  lat: number;
  lng: number;
  title?: string;
};

type CorridorItem = {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  title?: string;
};

type RouteOverlayData = {
  radarPoints: LatLngPoint[];
  controlPoints: LatLngPoint[];
  corridorPoints: CorridorItem[];
};

type Props = {
  from: string;
  to: string;
  overlayData?: RouteOverlayData;
};

let mapsConfigured = false;

export default function GoogleRouteMap({
  from,
  to,
  overlayData,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let map: google.maps.Map | null = null;
    let routePolylines: google.maps.Polyline[] = [];
    let corridorPolylines: google.maps.Polyline[] = [];
    let markers: Array<{ map?: google.maps.Map | null; setMap?: (map: google.maps.Map | null) => void }> = [];

    async function initMap() {
      try {
        if (!mapRef.current) return;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

        if (!apiKey) {
          setError("Google Maps API key eksik.");
          return;
        }

        if (!mapsConfigured) {
          setOptions({
            key: apiKey,
            v: "weekly",
            language: "tr",
            region: "TR",
          });
          mapsConfigured = true;
        }

        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement, PinElement } =
          (await importLibrary("marker")) as google.maps.MarkerLibrary;

        map = new Map(mapRef.current, {
          center: { lat: 39.0, lng: 35.0 },
          zoom: 6,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const directionsService = new google.maps.DirectionsService();

        const routeResult = await directionsService.route({
          origin: from,
          destination: to,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        const route = routeResult.routes?.[0];

        if (!route) {
          setError("Rota üretilemedi.");
          return;
        }

        const path = route.overview_path;

        const routePolyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 6,
          map,
        });

        routePolylines.push(routePolyline);

        const bounds = new google.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 80);

        const firstLeg = route.legs?.[0];

        if (firstLeg?.start_location) {
          const startPin = new PinElement({
            glyph: "A",
          });

          const startMarker = new AdvancedMarkerElement({
            map,
            position: firstLeg.start_location,
            title: "Başlangıç",
            content: startPin.element,
          });

          markers.push(startMarker);
        }

        if (firstLeg?.end_location) {
          const endPin = new PinElement({
            glyph: "B",
          });

          const endMarker = new AdvancedMarkerElement({
            map,
            position: firstLeg.end_location,
            title: "Bitiş",
            content: endPin.element,
          });

          markers.push(endMarker);
        }

        overlayData?.radarPoints?.forEach((point) => {
          const pin = new PinElement({
            background: "#dc2626",
            borderColor: "#991b1b",
            glyphColor: "#ffffff",
            glyph: "R",
            scale: 1.1,
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: point.lat, lng: point.lng },
            title: point.title || "Radar",
            content: pin.element,
          });

          markers.push(marker);
        });

        overlayData?.controlPoints?.forEach((point) => {
          const pin = new PinElement({
            background: "#f59e0b",
            borderColor: "#b45309",
            glyphColor: "#ffffff",
            glyph: "K",
            scale: 1.1,
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: point.lat, lng: point.lng },
            title: point.title || "Kontrol Noktası",
            content: pin.element,
          });

          markers.push(marker);
        });

        overlayData?.corridorPoints?.forEach((corridor) => {
          const line = new google.maps.Polyline({
            path: [
              { lat: corridor.start.lat, lng: corridor.start.lng },
              { lat: corridor.end.lat, lng: corridor.end.lng },
            ],
            geodesic: true,
            strokeColor: "#7c3aed",
            strokeOpacity: 0.95,
            strokeWeight: 7,
            map,
          });

          corridorPolylines.push(line);

          const startPin = new PinElement({
            background: "#7c3aed",
            borderColor: "#5b21b6",
            glyphColor: "#ffffff",
            glyph: "B",
            scale: 1.0,
          });

          const endPin = new PinElement({
            background: "#4c1d95",
            borderColor: "#2e1065",
            glyphColor: "#ffffff",
            glyph: "S",
            scale: 1.0,
          });

          const startMarker = new AdvancedMarkerElement({
            map,
            position: {
              lat: corridor.start.lat,
              lng: corridor.start.lng,
            },
            title: corridor.title || "Koridor Başlangıcı",
            content: startPin.element,
          });

          const endMarker = new AdvancedMarkerElement({
            map,
            position: {
              lat: corridor.end.lat,
              lng: corridor.end.lng,
            },
            title: corridor.title || "Koridor Sonu",
            content: endPin.element,
          });

          markers.push(startMarker, endMarker);
        });

        setError("");
      } catch (err) {
        console.error(err);
        setError("Google Maps yüklenirken hata oluştu.");
      }
    }

    initMap();

    return () => {
      routePolylines.forEach((p) => p.setMap(null));
      corridorPolylines.forEach((p) => p.setMap(null));
      markers.forEach((m) => {
        if (typeof m.setMap === "function") {
          m.setMap(null);
        } else if ("map" in m) {
          m.map = null;
        }
      });
    };
  }, [from, to, overlayData]);

  return (
    <div className="w-full">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div
        ref={mapRef}
        className="h-[520px] w-full rounded-2xl border border-neutral-200"
      />
    </div>
  );
}