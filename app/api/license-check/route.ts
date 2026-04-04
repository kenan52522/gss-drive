import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const device_id = req.nextUrl.searchParams.get("device_id")?.trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "E-posta gerekli." },
        { status: 400 }
      );
    }

    if (!device_id) {
      return NextResponse.json(
        { ok: false, error: "Cihaz kimliği gerekli." },
        { status: 400 }
      );
    }

    const { data: license, error: licenseError } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("email", email)
      .eq("status", "active")
      .maybeSingle();

    if (licenseError) {
      return NextResponse.json(
        { ok: false, error: licenseError.message },
        { status: 500 }
      );
    }

    if (license) {
      const { data: existingDevice, error: deviceError } = await supabaseAdmin
        .from("license_devices")
        .select("*")
        .eq("license_id", license.id)
        .maybeSingle();

      if (deviceError) {
        return NextResponse.json(
          { ok: false, error: deviceError.message },
          { status: 500 }
        );
      }

      if (!existingDevice) {
        const { error: insertDeviceError } = await supabaseAdmin
          .from("license_devices")
          .insert([
            {
              license_id: license.id,
              device_id,
            },
          ]);

        if (insertDeviceError) {
          return NextResponse.json(
            { ok: false, error: insertDeviceError.message },
            { status: 500 }
          );
        }
      } else if (existingDevice.device_id !== device_id) {
        return NextResponse.json({
          ok: true,
          hasActiveLicense: false,
          error: "Bu lisans başka bir cihazda kayıtlı.",
          license: null,
          request: null,
        });
      }
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("license_requests")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (requestError) {
      return NextResponse.json(
        { ok: false, error: requestError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      hasActiveLicense: !!license,
      license: license || null,
      request: request || null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}