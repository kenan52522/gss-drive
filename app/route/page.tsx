"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeviceId } from "@/lib/utils/device";

export default function RoutePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      const email = "kenan@gmail.com";
      const deviceId = getDeviceId();

      const res = await fetch(
        `/api/license-check?email=${encodeURIComponent(email)}&device_id=${encodeURIComponent(deviceId)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!data.ok || !data.hasActiveLicense) {
        router.push("/");
        return;
      }

      setChecked(true);
    }

    check();
  }, [router]);

  if (!checked) {
    return (
      <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        <p>Yetki kontrol ediliyor...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>GSS Drive Ana Uygulama</h1>
      <p>Lisans doğrulandı. Ana uygulama alanına geldiniz.</p>
    </main>
  );
}