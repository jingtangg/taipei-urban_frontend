/**
 * API 服務層
 *
 * 職責:
 * - 封裝後端 API 呼叫,提供型別安全的介面
 * - 統一處理錯誤訊息與參數格式
 * - 與 types/geo.ts 配合確保資料型別正確性
 *
 * 設計模式:
 * - 所有地圖圖層資料都支援 district 參數進行行政區篩選
 * - 使用泛型 <T> 確保回傳資料符合對應的 FeatureProps 型別
 */

import { apiQuery } from './api'
import type {RoadFeatureProps, FireHydrantFeatureProps, FireStationFeatureProps, DistrictStats, District} from '../types/geo'

/**
 * 取得道路資料
 * @param district - 行政區名稱(選填),例如 '大安區'。不傳則查詢全台北市
 * @returns Promise<RoadFeatureProps[]> 道路圖徵陣列,包含寬度、名稱、幾何資料
 */
export const getRoads = (district?: string) =>
  apiQuery<RoadFeatureProps[]>(
    '/roads',
    { district },
    '無道路資料，請確認查詢資訊是否正確',
    'GET',
  )

/**
 * 取得消防栓資料
 * @param district - 行政區名稱(選填)
 * @returns Promise<FireHydrantFeatureProps[]> 消防栓圖徵陣列,包含位置、狀態等資訊
 */
export const getFireHydrants = (district?: string) =>
  apiQuery<FireHydrantFeatureProps[]>(
    '/fire_hydrants',
    { district },
    '無消防栓資料，請確認查詢資訊是否正確',
    'GET',
  )

/**
 * 取得消防隊資料
 * @param district - 行政區名稱(選填)
 * @returns Promise<FireStationFeatureProps[]> 消防隊圖徵陣列,包含隊名、位置、轄區資訊
 */
export const getFireStations = (district?: string) =>
  apiQuery<FireStationFeatureProps[]>(
    '/fire_stations',
    { district },
    '無消防隊資料，請確認查詢資訊是否正確',
    'GET',
  )

/**
 * 取得行政區風險統計資料
 * @returns Promise<DistrictStats[]> 各行政區的防災風險統計指標
 */
export const getDistrictStats = () =>
  apiQuery<DistrictStats[]>(
    '/district_stats',
    {},
    '無統計資料，請確認系統狀態是否正常',
    'GET',
  )

/**
 * 取得行政區資料
 * @returns Promise<District[]> 行政區邊界與統計資料
 */
export const getDistricts = () =>
  apiQuery<District[]>(
    '/districts',
    {},
    '無法取得行政區資料',
    'GET',
  )
