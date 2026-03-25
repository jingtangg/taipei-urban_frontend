/**
 * 地理資料型別定義
 *
 * 職責:
 * - 定義所有地圖圖層的資料結構
 * - 確保前端與後端 API 的資料格式一致性
 * - 提供型別安全的地理資訊處理
 */

// ────────────────────────────────────────────────────────────
// API 層型別 - 對應後端資料庫欄位
// ────────────────────────────────────────────────────────────

/**
 * 都市計畫道路圖徵屬性
 * 對應後端 roads_planned 資料表結構（虛線底圖）
 */
export interface RoadFeatureProps {
  id: string
  road_width: string                          // 原始計畫路寬字串，如 "8M"
  width_m: number                             // 解析後的數值，如 8.0
  width_category: 'narrow' | 'mid' | 'wide'  // 寬度分級
  geometry: any                               // GeoJSON LineString
}

/**
 * 消防栓圖徵屬性
 * 對應後端 fire_hydrants 資料表結構
 */
export interface FireHydrantFeatureProps {
  id: number
  district: string         // 所屬行政區
  address?: string         // 設置地址
}

/**
 * 消防隊圖徵屬性
 * 對應後端 fire_stations 資料表結構
 */
export interface FireStationFeatureProps {
  id: number
  name: string             // 消防隊名稱
  district: string         // 轄區
  phone?: string           // 聯絡電話
}

/**
 * 窄巷圖徵屬性
 * 對應後端 narrow_alleys_temp 資料表結構（消防局實測窄巷 - 實線）
 */
export interface NarrowAlleyFeatureProps {
  id: string
  alley_name: string       // 巷道名稱
  district: string         // 行政區
  category: string         // 消防局分類（紅區/黃區）
  width_m: number          // 實際寬度
  road_width: number | null // 都市計畫寬度
  snap_distance_m: number | null // 吸附距離
  geometry: any            // GeoJSON LineString
}

/**
 * 行政區防災統計資料
 * 用於風險評估儀表板,非地圖圖層資料
 */
export interface DistrictStats {
  district: string                  // 行政區名稱
  area_km2: number                  // 行政區面積 (平方公里)
  narrow_alley_count: number        // 窄巷數量 (寬度 < 3.5m)
  narrow_alley_length_km: number    // 窄巷總長度 (公里)
  narrow_alley_density: number      // 窄巷密度 (公里/平方公里)
  hydrant_count: number             // 消防栓數量
  hydrant_density: number           // 消防栓密度 (個/平方公里)
  service_radius_m: number          // 消防栓理論服務半徑 (公尺)
}

/**
 * 行政區基本資料
 * 對應後端 /api/districts，用於下拉選單、列表等輕量查詢
 */
export interface DistrictBasic {
  id: string
  name: string       // 行政區名稱
  area_km2: number   // 行政區面積 (平方公里)
}

/**
 * 行政區完整資料
 * 對應後端 /api/districts/geojson，用於地圖圖層顯示
 */
export interface District extends DistrictBasic {
  geometry: any             // GeoJSON Polygon/MultiPolygon 格式
  narrowDensity: number     // 窄巷密度 (km/km²)
  hydrantDensity: number    // 消防栓密度 (/km²)
}

// ────────────────────────────────────────────────────────────
// 工具函數與常數 - 道路寬度分類
// ────────────────────────────────────────────────────────────

/**
 * 道路寬度分類
 * 用於地圖圖層樣式與風險評估
 */
export type RoadWidthClass = 'narrow' | 'medium' | 'wide'

/**
 * 道路寬度對應顏色（消防局實測實線）
 * 依消防法規與救災需求定義:
 * - 窄巷 (< 3.5m): 紅色 - 消防車無法通行
 * - 中等 (3.5-6m): 黃色 - 小型消防車可通行
 * - 寬敞 (> 6m): 綠色 - 標準消防車可通行（窄巷資料中不使用）
 */
export const ROAD_WIDTH_COLORS: Record<RoadWidthClass, string> = {
  narrow: '#fc2121',   // 紅色 - 極高風險
  medium: '#ffaa00',   // 黃色 - 高風險
  wide:   '#00ff41',   // 綠色 - 一般（不使用）
}

/**
 * 都市計畫道路寬度對應顏色（虛線底圖）
 * 使用不同色系以區別實測值與計畫值
 */
export const PLANNED_ROAD_COLORS: Record<RoadWidthClass, string> = {
  narrow: '#feaeda',   // 粉紅色 - 極高風險
  medium: '#fff873',   // 淺黃色 - 高風險
  wide:   '#2d9640',   // 深綠色 - 一般（不使用）
}

/**
 * 根據道路寬度判斷風險等級
 * @param width - 道路寬度 (公尺)
 * @returns RoadWidthClass 寬度分類
 *
 * @example
 * getRoadWidthClass(2.5)  // 'narrow'
 * getRoadWidthClass(5.0)  // 'medium'
 * getRoadWidthClass(8.0)  // 'wide'
 */
export function getRoadWidthClass(width: number): RoadWidthClass {
  if (width < 3.5) return 'narrow'
  if (width <= 6)  return 'medium'
  return 'wide'
}

/**
 * 根據道路寬度計算風險資訊
 * @param width - 道路寬度 (公尺)
 * @param colorScheme - 顏色方案 ('actual' 實測 | 'planned' 計畫)
 * @returns 風險等級、描述、顏色
 */
export function getRiskInfo(width: number, colorScheme: 'actual' | 'planned' = 'actual') {
  const colors = colorScheme === 'actual' ? ROAD_WIDTH_COLORS : PLANNED_ROAD_COLORS

  if (width < 3.5) {
    return {
      level: '極高風險',
      description: '消防車無法通行',
      color: colors.narrow
    }
  }
  if (width < 6) {
    return {
      level: '高風險',
      description: '通行受限',
      color: colors.medium
    }
  }
  return {
    level: '一般',
    description: '正常通行',
    color: colors.wide
  }
}

/**
 * 計算警示提醒
 * @param widthDiff - 路寬差異 (公尺)
 * @param snapDistance - 吸附距離 (公尺)
 * @returns 警示文字
 */
export function getWarning(widthDiff: number | null, snapDistance: number | null): string {
  const warnings: string[] = []

  // A. 路寬偏移警示
  if (widthDiff !== null) {
    const absWidthDiff = Math.abs(widthDiff)
    if (absWidthDiff > 30) {
      warnings.push('路寬偏移 ❗')
    } else if (absWidthDiff > 8) {
      warnings.push('路寬偏移 ❕')
    }
  }

  // B. 距離偏移警示
  if (snapDistance !== null) {
    if (snapDistance > 50) {
      warnings.push('距離偏移 ❗')
    } else if (snapDistance > 30) {
      warnings.push('距離偏移 ❕')
    }
  }

  return warnings.length > 0 ? warnings.join(' ') : '無'
}
