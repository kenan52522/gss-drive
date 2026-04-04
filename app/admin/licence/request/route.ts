import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const full_name = String(body.full_name || "").trim();
    const note = String(body.note || "").trim();
    const device_id = String(body.device_id || "").trim();
    const platform = String(body.platform || "").trim();
    const app_version = String(body.app_version || "").trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "E-posta zorunludur." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("license_requests")
      .insert([
        {
          email,
          full_name,
          note,
          device_id,
          platform,
          app_version,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, request: data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "İstek işlenemedi." },
      { status: 500 }
    );
  }
}