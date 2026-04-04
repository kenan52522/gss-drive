import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateLicenseKey } from "@/lib/utils/license";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const request_id = body.request_id;

    if (!request_id) {
      return NextResponse.json(
        { ok: false, error: "request_id gerekli" },
        { status: 400 }
      );
    }

    // 1. Talebi çek
    const { data: requestRow, error: reqError } = await supabaseAdmin
      .from("license_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !requestRow) {
      return NextResponse.json(
        { ok: false, error: "Talep bulunamadı" },
        { status: 404 }
      );
    }

    // 2. Lisans üret
    const license_key = generateLicenseKey();

    // 3. Lisans oluştur
    const { data: license, error: licenseError } = await supabaseAdmin
      .from("licenses")
      .insert([
        {
          license_key,
          email: requestRow.email,
          full_name: requestRow.full_name,
          status: "active",
        },
      ])
      .select()
      .single();

    if (licenseError) {
      return NextResponse.json(
        { ok: false, error: licenseError.message },
        { status: 500 }
      );
    }

    // 4. Talebi onayla
    await supabaseAdmin
      .from("license_requests")
      .update({ status: "approved" })
      .eq("id", request_id);

    return NextResponse.json({
      ok: true,
      license_key,
    });

  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}