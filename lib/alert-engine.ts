import { getDistanceMeters } from "./geo";
import { AlertPoint, AlertState } from "./types";

interface EvaluateAlertsResult {
  states: Record<string, AlertState>;
  triggered: string[];
  nearest: Array<{
    id: string;
    title: string;
    type: AlertPoint["type"];
    distance: number;
  }>;
}

export function evaluateAlerts(
  userLat: number,
  userLng: number,
  points: AlertPoint[],
  states: Record<string, AlertState>
): EvaluateAlertsResult {
  const updates: Record<string, AlertState> = { ...states };
  const triggered: string[] = [];

  const nearest = points
    .map((point) => ({
      id: point.id,
      title: point.title,
      type: point.type,
      distance: getDistanceMeters(userLat, userLng, point.lat, point.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  for (const point of points) {
    const distance = getDistanceMeters(userLat, userLng, point.lat, point.lng);
    const current = updates[point.id] || {};

    if (!current.warned500 && distance <= 500) {
      current.warned500 = true;

      if (point.type === "radar") {
        triggered.push("Dikkat, 500 metre sonra radar noktası var.");
      }

      if (point.type === "control") {
        triggered.push("Dikkat, 500 metre sonra trafik kontrol noktası var.");
      }

      if (point.type === "corridorStart") {
        triggered.push("Dikkat, 500 metre sonra hız koridoru başlıyor.");
      }
    }

    if (
      !current.warned300 &&
      point.type === "corridorEnd" &&
      distance <= 300
    ) {
      current.warned300 = true;
      triggered.push("Dikkat, hız koridoru bitiyor.");
    }

    if (
      !current.warned200 &&
      (point.type === "radar" || point.type === "control") &&
      distance <= 200
    ) {
      current.warned200 = true;

      if (point.type === "radar") {
        triggered.push("Radar noktasına çok yaklaştınız.");
      }

      if (point.type === "control") {
        triggered.push("Kontrol noktasına çok yaklaştınız.");
      }
    }

    if (!current.passed && distance <= 50) {
      current.passed = true;
    }

    updates[point.id] = current;
  }

  return {
    states: updates,
    triggered,
    nearest,
  };
}