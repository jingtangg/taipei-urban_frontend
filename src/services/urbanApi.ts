/**
 * services/urbanApi.ts — 領域 API 層（上層）
 * 對應 mapMixin.js 裡各個 getExactEarthApp / satOilspillSearch 的手法
 * 換成本專案（台北消防決策）的 endpoint
 */

import { dataQuery } from './api'
import type {
  RoadFeatureProps,
  FireHydrantFeatureProps,
  FireStationFeatureProps,
  DistrictStats,
} from '../types/geo'

// 功能 1.2 — 道路寬度（對應 getExactEarthApp 取船隻列表的手法）
export const getRoads = (district?: string) =>
  dataQuery<RoadFeatureProps>(
    '/api/roads',
    { district },
    '無道路資料，請確認查詢資訊是否正確',
    'GET',
  )

// 功能 2.1 — 消防栓
export const getFireHydrants = (district?: string) =>
  dataQuery<FireHydrantFeatureProps>(
    '/api/fire_hydrants',
    { district },
    '無消防栓資料',
    'GET',
  )

// 功能 2.2 — 消防隊
export const getFireStations = (district?: string) =>
  dataQuery<FireStationFeatureProps>(
    '/api/fire_stations',
    { district },
    '無消防隊資料',
    'GET',
  )

// 功能 3 — 行政區風險統計
export const getDistrictStats = () =>
  dataQuery<DistrictStats>(
    '/api/district_stats',
    {},
    '無統計資料',
    'GET',
  )
