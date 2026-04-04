import { NextResponse } from "next/server";
import { users } from "@/lib/license-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçerli e-posta gerekli." },
        { status: 400 }
      );
    }

    if (!users[email]) {
      users[email] = "pending";
    }

    return NextResponse.json({ status: users[email] });
  } catch {
    return NextResponse.json(
      { error: "İstek işlenemedi." },
      { status: 500 }
    );
  }
}