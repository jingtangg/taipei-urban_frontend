// ── 道路 Feature 屬性（對應 mapMixin.js:651-665 的 iconFeature 結構）──
export interface RoadFeatureProps {
  id: number
  road_width: number       // 單位：公尺
  road_name?: string
  district: string         // 行政區
  road_type?: string
}

// ── 消防栓 Feature 屬性 ──
export interface FireHydrantFeatureProps {
  id: number
  district: string
  address?: string
}

// ── 消防隊 Feature 屬性 ──
export interface FireStationFeatureProps {
  id: number
  name: string
  district: string
  phone?: string
}

// ── 行政區統計（區域風險，不是地圖 Feature，是 API 回傳的統計值）──
export interface DistrictStats {
  district: string
  area_km2: number
  narrow_alley_count: number        // <3.5m 窄巷數量
  narrow_alley_length_km: number    // 窄巷總長度
  narrow_alley_density: number      // km/km²
  hydrant_count: number
  hydrant_density: number           // 個/km²
  service_radius_m: number          // 理論服務半徑
}

// ── 道路寬度等級（功能 1.2 三色圖例）──
export type RoadWidthClass = 'narrow' | 'medium' | 'wide'

export const ROAD_WIDTH_COLORS: Record<RoadWidthClass, string> = {
  narrow: '#ff4444',   // < 3.5m
  medium: '#ffaa00',   // 3.5–6m
  wide:   '#00ff41',   // > 6m
}

export function getRoadWidthClass(width: number): RoadWidthClass {
  if (width < 3.5) return 'narrow'
  if (width <= 6)  return 'medium'
  return 'wide'
}
