/**
 * 地理資料型別定義
 *
 * 職責:
 * - 定義所有地圖圖層的資料結構
 * - 確保前端與後端 API 的資料格式一致性
 * - 提供型別安全的地理資訊處理
 */

// ════════════════════════════════════════════════════════════
// 基礎型別定義
// ════════════════════════════════════════════════════════════

/**
 * 道路寬度分類
 * 用於地圖圖層樣式與風險評估
 */
export type RoadWidthClass = 'narrow' | 'medium' | 'wide'

// ════════════════════════════════════════════════════════════
// 圖層圖徵型別 - 對應後端資料表結構
// ════════════════════════════════════════════════════════════

/**
 * 都市計畫道路圖徵屬性
 * 對應後端 roads_planned 資料表（虛線底圖）
 */
export interface RoadFeatureProps {
  id: string
  road_width: string                          // 原始計畫路寬字串，如 "8M"
  width_m: number                             // 解析後的數值，如 8.0
  width_category: 'narrow' | 'mid' | 'wide'  // 寬度分級
  geometry: any                               // GeoJSON LineString
}

/**
 * 窄巷圖徵屬性
 * 對應後端 narrow_alleys_temp 資料表（消防局實測窄巷 - 實線）
 */
export interface NarrowAlleyFeatureProps {
  id: string
  alley_name: string                // 巷道名稱
  district: string                  // 行政區
  category: string                  // 消防局分類（紅區/黃區）
  width_m: number                   // 實際寬度
  road_width: number | null         // 都市計畫寬度
  snap_distance_m: number | null    // 吸附距離
  geometry: any                     // GeoJSON LineString
}

/**
 * 消防栓圖徵屬性
 * 對應後端 fire_hydrants 資料表
 */
export interface FireHydrantFeatureProps {
  id: number
  district: string    // 所屬行政區
  address?: string    // 設置地址
}

/**
 * 消防隊圖徵屬性
 * 對應後端 fire_stations 資料表
 */
export interface FireStationFeatureProps {
  id: number
  name: string        // 消防隊名稱
  district: string    // 轄區
  phone?: string      // 聯絡電話
}

// ════════════════════════════════════════════════════════════
// 行政區型別
// ════════════════════════════════════════════════════════════

/**
 * 行政區基本資料
 * 對應後端 /api/districts，用於下拉選單、列表等輕量查詢
 */
export interface DistrictBasic {
  id: string
  name: string       // 行政區名稱
  area_km2: number   // 行政區面積 (km²)
}

/**
 * 行政區完整資料
 * 對應後端 /api/districts/geojson，用於地圖圖層顯示
 */
export interface District extends DistrictBasic {
  geometry: any             // GeoJSON Polygon/MultiPolygon
  narrowDensity: number     // 窄巷密度 (條/km²)
}

// ════════════════════════════════════════════════════════════
// 統計資料型別
// ════════════════════════════════════════════════════════════

/**
 * 窄巷統計數據
 * 對應後端 /api/dashboard/narrow-alley-statistics
 */
export interface NarrowAlleyStatistics {
  total: number            // 總窄巷數（去重後 = planned + new_discovered）
  planned: number          // 都市計畫窄巷數
  overlap: number          // 消防局重疊數
  new_discovered: number   // 消防局實際新增數
}

/**
 * 行政區排名項目
 * 對應後端 /api/dashboard/district-rankings
 */
export interface DistrictRanking {
  rank: number             // 排名
  district: string         // 行政區名稱
  total_count: number      // 總窄巷數
  density: number          // 密度 (條/km²)
}

/**
 * 消防栓統計數據
 * 對應後端 /api/dashboard/hydrant-statistics
 */
export interface HydrantStatistics {
  total_count: number      // 總消防栓數
  density: number          // 設置密度 (個/km²)
  service_radius: number   // 平均服務半徑 (m)
}

// ════════════════════════════════════════════════════════════
// 顏色配置常數
// ════════════════════════════════════════════════════════════

/**
 * 道路寬度對應顏色（消防局實測實線）
 * 依消防法規與救災需求定義:
 * - 窄巷 (< 3.5m): 紅色 - 消防車無法通行
 * - 中等 (3.5-6m): 黃色 - 小型消防車可通行
 * - 寬敞 (> 6m): 綠色 - 標準消防車可通行
 */
export const ROAD_WIDTH_COLORS: Record<RoadWidthClass, string> = {
  narrow: '#fc2121',   // 紅色 - 極高風險
  medium: '#ffaa00',   // 黃色 - 高風險
  wide:   '#00ff41',   // 綠色 - 一般
}

/**
 * 都市計畫道路寬度對應顏色（虛線底圖）
 * 使用不同色系以區別實測值與計畫值
 */
export const PLANNED_ROAD_COLORS: Record<RoadWidthClass, string> = {
  narrow: '#feaeda',   // 粉紅色 - 計畫窄巷
  medium: '#fff873',   // 淺黃色 - 計畫中等
  wide:   '#2d9640',   // 深綠色 - 計畫寬敞
}

// ════════════════════════════════════════════════════════════
// 工具函數
// ════════════════════════════════════════════════════════════

/**
 * 根據道路寬度判斷風險等級
 * @param width - 道路寬度 (公尺)
 * @returns 寬度分類
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

  // 路寬偏移警示
  if (widthDiff !== null) {
    const absWidthDiff = Math.abs(widthDiff)
    if (absWidthDiff > 30) {
      warnings.push('路寬偏移 ❗')
    } else if (absWidthDiff > 8) {
      warnings.push('路寬偏移 ❕')
    }
  }

  // 距離偏移警示
  if (snapDistance !== null) {
    if (snapDistance > 50) {
      warnings.push('距離偏移 ❗')
    } else if (snapDistance > 30) {
      warnings.push('距離偏移 ❕')
    }
  }

  return warnings.length > 0 ? warnings.join(' ') : '無'
}