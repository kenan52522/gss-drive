import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "E-posta adresi gerekli." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("licenses")
      .select("id, email, status, full_name, plan, license_key")
      .ilike("email", email)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "Bu e-posta için lisans bulunamadı." },
        { status: 404 }
      );
    }

    if (data.status !== "active") {
      return NextResponse.json(
        { ok: false, message: "Lisans pasif durumda." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Lisans doğrulandı.",
      email: data.email,
      full_name: data.full_name,
      plan: data.plan,
      license_key: data.license_key,
    });
  } catch (error) {
    console.error("LICENSE_CHECK_ERROR:", error);

    return NextResponse.json(
      { ok: false, message: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}