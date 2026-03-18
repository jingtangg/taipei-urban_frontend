/**
 * 地理資料型別定義
 *
 * 職責:
 * - 定義所有地圖圖層的資料結構
 * - 確保前端與後端 API 的資料格式一致性
 * - 提供型別安全的地理資訊處理
 *
 * 架構說明:
 * - API 層型別: 對應後端 Laravel API 回傳格式 (RoadFeatureProps 等)
 * - UI 層型別: 前端 Mock 資料格式,串接 API 後將被移除 (Road 等)
 * - 工具函數: 提供資料分類與樣式計算功能
 */

// ────────────────────────────────────────────────────────────
// API 層型別 - 對應後端資料庫欄位
// ────────────────────────────────────────────────────────────

/**
 * 道路圖徵屬性
 * 對應後端 roads 資料表結構
 */
export interface RoadFeatureProps {
  id: number
  road_width: number       // 道路寬度,單位:公尺 (用於計算窄巷風險)
  road_name?: string       // 道路名稱,可能為空
  district: string         // 所屬行政區
  road_type?: string       // 道路類型 (主要道路/次要道路/巷弄等)
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

// ────────────────────────────────────────────────────────────
// UI 層型別 - 前端 Mock 資料格式 (待移除)
// ────────────────────────────────────────────────────────────
// 注意: 以下型別僅供開發階段 Mock 資料使用
// 串接後端 API 後,應統一使用上方的 API 層型別

/**
 * 行政區資料 (Mock)
 * 包含完整的 GeoJSON 幾何資料
 */
export interface District {
  id: string
  name: string              // 行政區名稱
  area_km2: number          // 面積
  geometry: any             // GeoJSON Polygon 格式
  narrowDensity?: number    // 窄巷密度 (km/km²)
  hydrantDensity?: number   // 消防栓密度 (/km²)
}

/**
 * 道路資料 (Mock)
 * 與 RoadFeatureProps 的差異:
 * - ID 為字串 (Mock 資料慣例)
 * - 包含計畫寬度與實測寬度兩個欄位
 * - 有前端計算的 category 分類欄位
 */
export interface Road {
  id: string
  name: string
  district: string
  planned_width: number     // 計畫寬度 (都市計畫)
  measured_width: number    // 實測寬度 (現況)
  length_m: number          // 道路長度 (公尺)
  category: 'narrow' | 'mid' | 'wide'  // 寬度分類 (前端計算)
  geometry: any             // GeoJSON LineString 格式
}

/**
 * 消防栓資料 (Mock)
 * 與 FireHydrantFeatureProps 的差異:
 * - 有 type 欄位區分地上/地下型
 */
export interface FireHydrant {
  id: string
  type: 'underground' | 'aboveground'  // 地下式/地上式
  district: string
  geometry: any             // GeoJSON Point 格式 [經度, 緯度]
}

/**
 * 消防隊資料 (Mock)
 */
export interface FireStation {
  id: string
  name: string
  address: string
  district: string
  geometry: any             // GeoJSON Point 格式 [經度, 緯度]
}

/**
 * 統計資料 (Mock)
 * 與 DistrictStats 的差異:
 * - 使用 camelCase 命名 (前端慣例)
 * - 欄位較簡化
 */
export interface Stats {
  narrowAlleyCount: number      // 窄巷數量
  narrowAlleyLengthKm: number   // 窄巷總長度 (公里)
  narrowAlleyDensity: number    // 窄巷密度
  hydrantCount: number          // 消防栓數量
  hydrantDensity: number        // 消防栓密度
  avgServiceRadius: number      // 平均服務半徑 (公尺)
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
 * 道路寬度對應顏色
 * 依消防法規與救災需求定義:
 * - 窄巷 (< 3.5m): 紅色 - 消防車無法通行
 * - 中等 (3.5-6m): 橘色 - 小型消防車可通行
 * - 寬敞 (> 6m): 綠色 - 標準消防車可通行
 */
export const ROAD_WIDTH_COLORS: Record<RoadWidthClass, string> = {
  narrow: '#ff4444',   // 紅色 - 高風險
  medium: '#ffaa00',   // 橘色 - 中風險
  wide:   '#00ff41',   // 綠色 - 低風險
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
