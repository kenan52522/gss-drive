export type AlertPointType =
  | "radar"
  | "control"
  | "corridorStart"
  | "corridorEnd";

export interface AlertPoint {
  id: string;
  type: AlertPointType;
  title: string;
  lat: number;
  lng: number;
  raw?: unknown;
}

export interface AlertState {
  warned500?: boolean;
  warned300?: boolean;
  warned200?: boolean;
  passed?: boolean;
}

export interface RouteApiPoint {
  lat?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  enlem?: number | string;
  boylam?: number | string;
  title?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

export interface RouteApiResponse {
  success?: boolean;
  radarCount?: number;
  controlPointCount?: number;
  corridorCount?: number;
  riskScore?: number;
  routeData?: {
    radars?: RouteApiPoint[];
    controlPoints?: RouteApiPoint[];
    corridors?: RouteApiPoint[];
    corridorStarts?: RouteApiPoint[];
    corridorEnds?: RouteApiPoint[];
    [key: string]: unknown;
  };
  data?: {
    radars?: RouteApiPoint[];
    controlPoints?: RouteApiPoint[];
    corridors?: RouteApiPoint[];
    corridorStarts?: RouteApiPoint[];
    corridorEnds?: RouteApiPoint[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}