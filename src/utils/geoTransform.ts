/**
 * GeoJSON → OpenLayers Feature 轉換工廠
 *
 * 職責:
 * - 將後端 API 回傳的 GeoJSON 資料轉換成 OL Feature 物件
 * - 統一管理 property 欄位對應與座標系轉換（WGS84 → Web Mercator）
 *
 * 設計原則:
 * - 每個函式只做「資料格式轉換」，不含樣式與圖層設定
 * - type 欄位統一賦值，供 Map.tsx 點擊事件識別 Feature 種類
 */

import { Feature } from 'ol'
import { Point, LineString } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import type {
  FireHydrantFeatureProps,
  FireStationFeatureProps,
  NarrowAlleyFeatureProps,
  RoadFeatureProps,
} from '../types/geo'
import { RISK_THRESHOLD_HIGH } from '../constants/riskThresholds'

export function toHydrantFeatures(hydrants: FireHydrantFeatureProps[]): Feature[] {
  return hydrants.map(h => new Feature({
    geometry: new Point(fromLonLat([h.geometry.coordinates[0], h.geometry.coordinates[1]])),
    district:     h.district,
    hydrant_type: h.type,
    type: 'hydrant',
  }))
}

export function toStationFeatures(stations: FireStationFeatureProps[]): Feature[] {
  return stations.map(s => new Feature({
    geometry: new Point(fromLonLat([s.geometry.coordinates[0], s.geometry.coordinates[1]])),
    name:    s.name,
    address: s.address,
    type: 'station',
  }))
}

export function toNarrowAlleyFeatures(alleys: NarrowAlleyFeatureProps[]): Feature[] {
  return alleys.map(alley => new Feature({
    geometry: new LineString(
      alley.geometry.coordinates.map((c: number[]) => fromLonLat([c[0], c[1]]))
    ),
    id:              alley.id,
    alley_name:      alley.alley_name,
    district:        alley.district,
    category:        alley.category,
    width_m:         alley.width_m,
    road_width:      alley.road_width,
    snap_distance_m: alley.snap_distance_m,
    type: 'narrow_alley',
  }))
}

/** 僅保留 width_m < RISK_THRESHOLD_HIGH 的道路作為窄巷虛線底圖 */
export function toRoadFeatures(roads: RoadFeatureProps[]): Feature[] {
  return roads
    .filter(r => r.width_m < RISK_THRESHOLD_HIGH)
    .map(r => new Feature({
      geometry: new LineString(
        r.geometry.coordinates.map((c: number[]) => fromLonLat([c[0], c[1]]))
      ),
      road_width:     r.road_width,
      width_m:        r.width_m,
      width_category: r.width_category,
      type: 'road',
    }))
}
