export interface District {
  id: string;
  name: string;
  area_km2: number;
  geometry: any; // GeoJSON Polygon
}

export interface Road {
  id: string;
  name: string;
  district: string;
  planned_width: number;
  measured_width: number;
  length_m: number;
  category: 'narrow' | 'mid' | 'wide';
  geometry: any; // GeoJSON LineString
}

export interface FireHydrant {
  id: string;
  type: 'underground' | 'aboveground';
  district: string;
  geometry: any; // GeoJSON Point [lng, lat]
}

export interface FireStation {
  id: string;
  name: string;
  address: string;
  district: string;
  geometry: any; // GeoJSON Point [lng, lat]
}

export interface Stats {
  narrowAlleyCount: number;
  narrowAlleyLengthKm: number;
  narrowAlleyDensity: number;
  hydrantCount: number;
  hydrantDensity: number;
  avgServiceRadius: number;
}
