import { NextResponse } from "next/server";
import { users } from "@/lib/license-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const status = String(body.status || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçerli e-posta gerekli." },
        { status: 400 }
      );
    }

    if (!["pending", "approved", "blocked"].includes(status)) {
      return NextResponse.json(
        { error: "Geçersiz durum." },
        { status: 400 }
      );
    }

    users[email] = status;

    return NextResponse.json({
      success: true,
      email,
      status,
    });
  } catch {
    return NextResponse.json(
      { error: "İstek işlenemedi." },
      { status: 500 }
    );
  }
}