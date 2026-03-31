export type AlertPointType =
  | "radar"
  | "control"
  | "corridor_start"
  | "corridor_end";

export interface AlertPoint {
  id: string;
  type: AlertPointType;
  lat: number;
  lng: number;
  title: string;
  triggerDistance: number;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const num = Number(normalized);
    if (Number.isFinite(num)) return num;
  }

  return null;
}

function createPoint(
  id: string,
  type: AlertPointType,
  title: string,
  latValue: unknown,
  lngValue: unknown,
  triggerDistance: number
): AlertPoint | null {
  const lat = parseNumber(latValue);
  const lng = parseNumber(lngValue);

  if (lat === null || lng === null) return null;

  return {
    id,
    type,
    lat,
    lng,
    title,
    triggerDistance,
  };
}

function addPointIfValid(
  points: AlertPoint[],
  point: AlertPoint | null,
  seen: Set<string>
) {
  if (!point) return;

  const key = `${point.type}-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`;
  if (seen.has(key)) return;

  seen.add(key);
  points.push(point);
}

function getArrayByPossibleKeys(obj: any, keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function inferLat(item: any) {
  return (
    item?.lat ??
    item?.latitude ??
    item?.enlem ??
    item?.y ??
    item?.Lat ??
    item?.Latitude ??
    item?.Y ??
    item?.location?.lat ??
    item?.location?.latitude ??
    item?.coordinate?.lat ??
    item?.coordinate?.latitude ??
    item?.point?.lat ??
    item?.point?.latitude
  );
}

function inferLng(item: any) {
  return (
    item?.lng ??
    item?.lon ??
    item?.longitude ??
    item?.boylam ??
    item?.x ??
    item?.Lng ??
    item?.Lon ??
    item?.Longitude ??
    item?.X ??
    item?.location?.lng ??
    item?.location?.lon ??
    item?.location?.longitude ??
    item?.coordinate?.lng ??
    item?.coordinate?.lon ??
    item?.coordinate?.longitude ??
    item?.point?.lng ??
    item?.point?.lon ??
    item?.point?.longitude
  );
}

function inferTypeFromItem(item: any): AlertPointType | null {
  const raw =
    [
      item?.type,
      item?.pointType,
      item?.kind,
      item?.category,
      item?.name,
      item?.label,
      item?.title,
      item?.description,
      item?.featureType,
      item?.warningType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase() || "";

  if (
    raw.includes("radar") ||
    raw.includes("eds") ||
    item?.isRadar === true ||
    item?.radar === true
  ) {
    return "radar";
  }

  if (
    raw.includes("kontrol") ||
    raw.includes("control") ||
    raw.includes("checkpoint") ||
    item?.isControl === true ||
    item?.controlPoint === true
  ) {
    return "control";
  }

  if (
    raw.includes("koridor başlangıç") ||
    raw.includes("corridor start") ||
    raw.includes("tunnel start") ||
    item?.isCorridorStart === true
  ) {
    return "corridor_start";
  }

  if (
    raw.includes("koridor bitiş") ||
    raw.includes("corridor end") ||
    raw.includes("tunnel end") ||
    item?.isCorridorEnd === true
  ) {
    return "corridor_end";
  }

  return null;
}

function walkObjects(
  value: any,
  visitor: (item: any) => void,
  visited = new WeakSet<object>()
) {
  if (value == null) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      walkObjects(item, visitor, visited);
    }
    return;
  }

  if (typeof value !== "object") return;

  if (visited.has(value)) return;
  visited.add(value);

  visitor(value);

  for (const key of Object.keys(value)) {
    walkObjects(value[key], visitor, visited);
  }
}

function normalizeSpeedTunnels(
  speedTunnels: any[],
  points: AlertPoint[],
  seen: Set<string>
) {
  speedTunnels.forEach((item: any, index: number) => {
    const startPoint = createPoint(
      `speed-tunnel-start-${index}`,
      "corridor_start",
      "500 metre sonra hız koridoru başlıyor",
      item?.startLat ??
        item?.startLatitude ??
        item?.baslangicLat ??
        item?.beginLat ??
        item?.firstLat ??
        item?.start?.lat ??
        item?.start?.latitude ??
        item?.begin?.lat ??
        item?.begin?.latitude ??
        item?.firstPoint?.lat ??
        inferLat(item?.points?.[0]),
      item?.startLng ??
        item?.startLon ??
        item?.startLongitude ??
        item?.baslangicLng ??
        item?.beginLng ??
        item?.firstLng ??
        item?.start?.lng ??
        item?.start?.lon ??
        item?.start?.longitude ??
        item?.begin?.lng ??
        item?.begin?.lon ??
        item?.begin?.longitude ??
        item?.firstPoint?.lng ??
        item?.firstPoint?.lon ??
        inferLng(item?.points?.[0]),
      500
    );

    const lastPointCandidate =
      Array.isArray(item?.points) && item.points.length > 0
        ? item.points[item.points.length - 1]
        : null;

    const endPoint = createPoint(
      `speed-tunnel-end-${index}`,
      "corridor_end",
      "300 metre sonra hız koridoru bitiyor",
      item?.endLat ??
        item?.endLatitude ??
        item?.bitisLat ??
        item?.lastLat ??
        item?.end?.lat ??
        item?.end?.latitude ??
        item?.lastPoint?.lat ??
        inferLat(lastPointCandidate),
      item?.endLng ??
        item?.endLon ??
        item?.endLongitude ??
        item?.bitisLng ??
        item?.lastLng ??
        item?.end?.lng ??
        item?.end?.lon ??
        item?.end?.longitude ??
        item?.lastPoint?.lng ??
        item?.lastPoint?.lon ??
        inferLng(lastPointCandidate),
      300
    );

    addPointIfValid(points, startPoint, seen);
    addPointIfValid(points, endPoint, seen);
  });
}

function normalizeExplicitArrays(data: any, points: AlertPoint[], seen: Set<string>) {
  const radars = [
    ...getArrayByPossibleKeys(data, [
      "radars",
      "radarPoints",
      "radar_list",
      "radarList",
      "radarItems",
    ]),
    ...getArrayByPossibleKeys(data?.data, [
      "radars",
      "radarPoints",
      "radar_list",
      "radarList",
      "radarItems",
    ]),
    ...getArrayByPossibleKeys(data?.result, [
      "radars",
      "radarPoints",
      "radar_list",
      "radarList",
      "radarItems",
    ]),
  ];

  const controls = [
    ...getArrayByPossibleKeys(data, [
      "controls",
      "controlPoints",
      "control_list",
      "controlList",
      "checkpoints",
    ]),
    ...getArrayByPossibleKeys(data?.data, [
      "controls",
      "controlPoints",
      "control_list",
      "controlList",
      "checkpoints",
    ]),
    ...getArrayByPossibleKeys(data?.result, [
      "controls",
      "controlPoints",
      "control_list",
      "controlList",
      "checkpoints",
    ]),
  ];

  const speedTunnels = [
    ...getArrayByPossibleKeys(data, [
      "corridors",
      "speedCorridors",
      "corridor_list",
      "corridorList",
      "speedTunnels",
    ]),
    ...getArrayByPossibleKeys(data?.data, [
      "corridors",
      "speedCorridors",
      "corridor_list",
      "corridorList",
      "speedTunnels",
    ]),
    ...getArrayByPossibleKeys(data?.result, [
      "corridors",
      "speedCorridors",
      "corridor_list",
      "corridorList",
      "speedTunnels",
    ]),
  ];

  radars.forEach((item: any, index: number) => {
    addPointIfValid(
      points,
      createPoint(
        `radar-${index}`,
        "radar",
        "500 metre sonra radar noktası var",
        inferLat(item),
        inferLng(item),
        500
      ),
      seen
    );
  });

  controls.forEach((item: any, index: number) => {
    addPointIfValid(
      points,
      createPoint(
        `control-${index}`,
        "control",
        "500 metre sonra kontrol noktası var",
        inferLat(item),
        inferLng(item),
        500
      ),
      seen
    );
  });

  normalizeSpeedTunnels(speedTunnels, points, seen);
}

function normalizeGenericObjects(data: any, points: AlertPoint[], seen: Set<string>) {
  let genericIndex = 0;

  walkObjects(data, (item) => {
    const lat = inferLat(item);
    const lng = inferLng(item);

    if (lat == null || lng == null) return;

    const inferredType = inferTypeFromItem(item);
    if (!inferredType) return;

    const title =
      inferredType === "radar"
        ? "500 metre sonra radar noktası var"
        : inferredType === "control"
        ? "500 metre sonra kontrol noktası var"
        : inferredType === "corridor_start"
        ? "500 metre sonra hız koridoru başlıyor"
        : "300 metre sonra hız koridoru bitiyor";

    const triggerDistance = inferredType === "corridor_end" ? 300 : 500;

    addPointIfValid(
      points,
      createPoint(
        `generic-${genericIndex++}`,
        inferredType,
        title,
        lat,
        lng,
        triggerDistance
      ),
      seen
    );
  });
}

function normalizeRouteCoordinates(data: any, points: AlertPoint[], seen: Set<string>) {
  const routeCoordinates = [
    ...getArrayByPossibleKeys(data, ["routeCoordinates", "coordinates", "route_points"]),
    ...getArrayByPossibleKeys(data?.data, ["routeCoordinates", "coordinates", "route_points"]),
    ...getArrayByPossibleKeys(data?.result, ["routeCoordinates", "coordinates", "route_points"]),
  ];

  routeCoordinates.forEach((item: any, index: number) => {
    const lat = inferLat(item);
    const lng = inferLng(item);

    if (lat == null || lng == null) return;

    const radarLike =
      item?.isRadar === true ||
      item?.radar === true ||
      item?.radarPoint === true ||
      item?.hasRadar === true ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("radar");

    const controlLike =
      item?.isControl === true ||
      item?.control === true ||
      item?.controlPoint === true ||
      item?.checkpoint === true ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("kontrol") ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("control");

    const corridorStartLike =
      item?.isCorridorStart === true ||
      item?.corridorStart === true ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("corridor start") ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("koridor başlangıç");

    const corridorEndLike =
      item?.isCorridorEnd === true ||
      item?.corridorEnd === true ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("corridor end") ||
      String(item?.type || item?.pointType || item?.name || "")
        .toLowerCase()
        .includes("koridor bitiş");

    if (radarLike) {
      addPointIfValid(
        points,
        createPoint(
          `route-radar-${index}`,
          "radar",
          "500 metre sonra radar noktası var",
          lat,
          lng,
          500
        ),
        seen
      );
    }

    if (controlLike) {
      addPointIfValid(
        points,
        createPoint(
          `route-control-${index}`,
          "control",
          "500 metre sonra kontrol noktası var",
          lat,
          lng,
          500
        ),
        seen
      );
    }

    if (corridorStartLike) {
      addPointIfValid(
        points,
        createPoint(
          `route-corridor-start-${index}`,
          "corridor_start",
          "500 metre sonra hız koridoru başlıyor",
          lat,
          lng,
          500
        ),
        seen
      );
    }

    if (corridorEndLike) {
      addPointIfValid(
        points,
        createPoint(
          `route-corridor-end-${index}`,
          "corridor_end",
          "300 metre sonra hız koridoru bitiyor",
          lat,
          lng,
          300
        ),
        seen
      );
    }
  });
}

export function normalizeRouteData(data: any): AlertPoint[] {
  const points: AlertPoint[] = [];
  const seen = new Set<string>();

  normalizeExplicitArrays(data, points, seen);
  normalizeRouteCoordinates(data, points, seen);
  normalizeGenericObjects(data, points, seen);

  return points;
}