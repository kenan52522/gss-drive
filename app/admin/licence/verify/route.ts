import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const license_key = String(body.license_key || "").trim().toUpperCase();
    const device_id = String(body.device_id || "").trim();
    const platform = String(body.platform || "").trim();
    const app_version = String(body.app_version || "").trim();

    if (!license_key || !device_id) {
      return NextResponse.json(
        { ok: false, error: "Lisans anahtarı ve cihaz kimliği zorunludur." },
        { status: 400 }
      );
    }

    const { data: license, error } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("license_key", license_key)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!license) {
      return NextResponse.json(
        { ok: false, error: "Lisans bulunamadı." },
        { status: 404 }
      );
    }

    if (license.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Lisans aktif değil." },
        { status: 403 }
      );
    }

    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Lisans süresi dolmuş." },
        { status: 403 }
      );
    }

    if (license.bound_device_id && license.bound_device_id !== device_id) {
      return NextResponse.json(
        { ok: false, error: "Bu lisans başka bir cihaza tanımlı." },
        { status: 403 }
      );
    }

    if (!license.bound_device_id) {
      const { error: bindError } = await supabaseAdmin
        .from("licenses")
        .update({ bound_device_id: device_id })
        .eq("id", license.id);

      if (bindError) {
        return NextResponse.json(
          { ok: false, error: bindError.message },
          { status: 500 }
        );
      }
    }

    await supabaseAdmin
      .from("license_devices")
      .upsert(
        {
          license_id: license.id,
          device_id,
          platform,
          app_version,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "license_id,device_id" }
      );

    return NextResponse.json({
      ok: true,
      licensed: true,
      license: {
        email: license.email,
        plan: license.plan,
        expires_at: license.expires_at,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Doğrulama işlemi başarısız." },
      { status: 500 }
    );
  }
}