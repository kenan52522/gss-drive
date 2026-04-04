import { NextResponse } from "next/server";
import { users } from "@/lib/license-store";

export async function GET() {
  const items = Object.entries(users).map(([email, status]) => ({
    email,
    status,
  }));

  return NextResponse.json({ items });
}