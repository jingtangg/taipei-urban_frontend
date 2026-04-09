/**
 * 地理資料型別定義
 *
 * 職責:
 * - 定義所有地圖圖層的資料結構
 * - 確保前端與後端 API 的資料格式一致性
 * - 提供型別安全的地理資訊處理
 */
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
  district: string                          // 所屬行政區
  address?: string                          // 設置地址
  type?: 'aboveground' | 'underground'      // 消防栓種類（地上式 / 地下式）
  geometry: { coordinates: number[] }       // GeoJSON Point
}

/**
 * 消防隊圖徵屬性
 * 對應後端 fire_stations 資料表
 */
export interface FireStationFeatureProps {
  id: number
  name: string        // 消防隊名稱
  district: string    // 轄區
  address?: string    // 地址
  phone?: string      // 聯絡電話
  geometry: { coordinates: number[] }   // GeoJSON Point
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
 * 行政區元資料
 * 對應後端 /api/districts/metadata
 * 幾何邊界由 GeoServer WMS 負責渲染，此 type 只含前端所需的元資料欄位
 */
export interface District extends DistrictBasic {
  narrowDensity: number     // 窄巷密度 (條/km²)，供標籤邊框顏色使用
  label_center: string      // WKT "POINT(lng lat)"，供縮放動畫使用
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

