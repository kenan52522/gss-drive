import { NextResponse } from "next/server";

const EDGE_FUNCTION_URL =
  "https://vixoxabjkaxxfnhseacg.supabase.co/functions/v1/smooth-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fromCity = String(body?.fromCity ?? "").trim();
    const fromDistrict = String(body?.fromDistrict ?? "").trim();
    const toCity = String(body?.toCity ?? "").trim();
    const toDistrict = String(body?.toDistrict ?? "").trim();

    // 🔥 DOĞRU FORMAT (LEVEL-5 FORMATIN)
    const payload = {
      fromCity: fromCity,
      fromDistrict: fromDistrict,
      toCity: toCity,
      toDistrict: toDistrict,
    };

    console.log("EDGE FINAL PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();

    let rawData: any = {};
    try {
      rawData = rawText ? JSON.parse(rawText) : {};
    } catch {
      rawData = { rawText };
    }

    console.log("EDGE FINAL RESPONSE:", JSON.stringify(rawData, null, 2));

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Edge function hata döndürdü.",
          status: response.status,
          sentPayload: payload,
          rawData,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(rawData);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Proxy route hata verdi.",
        error: error?.message ?? "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}