import { NextRequest, NextResponse } from "next/server";

type OverlayPoint = {
  id: string;
  type: "radar" | "control" | "corridor_start" | "corridor_end";
  title: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
};

function isValidPoint(lat: unknown, lng: unknown) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      from,
      to,
      fromLatitude,
      fromLongitude,
      toLatitude,
      toLongitude,
      fromDistrictId,
      toDistrictId,
    } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: "from ve to zorunlu." },
        { status: 400 }
      );
    }

    if (
      !isValidPoint(fromLatitude, fromLongitude) ||
      !isValidPoint(toLatitude, toLongitude)
    ) {
      return NextResponse.json(
        { error: "Geçerli başlangıç ve hedef koordinatları zorunlu." },
        { status: 400 }
      );
    }

    if (
      typeof fromDistrictId !== "number" ||
      typeof toDistrictId !== "number"
    ) {
      return NextResponse.json(
        {
          error:
            "Başlangıç ve hedef için districtId bulunamadı. district-map dosyasını güncelle.",
        },
        { status: 400 }
      );
    }

    const payload = {
      fromLatitude,
      fromLongitude,
      toLatitude,
      toLongitude,
      fromDistrictId,
      toDistrictId,
    };

    const res = await fetch(
      "https://vixoxabjkaxxfnhseacg.supabase.co/functions/v1/smooth-handler",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const json = await res.json();
    const data = json?.data;

    if (!res.ok || !data) {
      throw new Error("smooth-handler verisi alınamadı.");
    }

    const overlayPoints: OverlayPoint[] = [];

    for (const r of data.radars || []) {
      if (!isValidPoint(r.lat, r.lng)) continue;

      overlayPoints.push({
        id: r.id || `radar-${overlayPoints.length + 1}`,
        type: "radar",
        title: r.title || "Radar",
        lat: r.lat,
        lng: r.lng,
        city: r.city,
        district: r.district,
      });
    }

    for (const c of data.controls || []) {
      if (!isValidPoint(c.lat, c.lng)) continue;

      overlayPoints.push({
        id: c.id || `control-${overlayPoints.length + 1}`,
        type: "control",
        title: c.title || "Kontrol Noktası",
        lat: c.lat,
        lng: c.lng,
        city: c.city,
        district: c.district,
      });
    }

    for (const c of data.corridors || []) {
      if (isValidPoint(c.startLat, c.startLng)) {
        overlayPoints.push({
          id: `${c.id || `corridor-${overlayPoints.length + 1}`}-start`,
          type: "corridor_start",
          title: "Koridor Başlangıcı",
          lat: c.startLat,
          lng: c.startLng,
          city: c.city,
          district: c.district,
        });
      }

      if (isValidPoint(c.endLat, c.endLng)) {
        overlayPoints.push({
          id: `${c.id || `corridor-${overlayPoints.length + 1}`}-end`,
          type: "corridor_end",
          title: "Koridor Bitişi",
          lat: c.endLat,
          lng: c.endLng,
          city: c.city,
          district: c.district,
        });
      }
    }

    return NextResponse.json({
      success: true,
      overlayPoints,
      summary: {
        radar: Number(data.radarCount ?? 0),
        control: Number(data.controlPointCount ?? 0),
        corridorStart: Number(data.corridorCount ?? 0),
        corridorEnd: Number(data.corridorCount ?? 0),
      },
      meta: {
        fromDistrictId,
        toDistrictId,
        fromLatitude,
        fromLongitude,
        toLatitude,
        toLongitude,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sunucu hatası",
      },
      { status: 500 }
    );
  }
}