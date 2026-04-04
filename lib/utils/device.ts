export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    let deviceId = localStorage.getItem("gss_device_id");

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("gss_device_id", deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error("Device ID oluşturulamadı:", error);
    return "";
  }
}