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
  HualienNarrowAlleyFeatureProps,
  NarrowAlleyFeatureProps,
  RoadFeatureProps,
} from '../types/geo'

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
    risk_level:      alley.risk_level,
    road_width:      alley.road_width,
    snap_distance_m: alley.snap_distance_m,
    type: 'narrow_alley',
  }))
}

function perpendicularLine(coords: number[][], widthM: number): number[][] {
  const start = coords[0]
  const end = coords[coords.length - 1]
  const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return coords
  const px = -dy / len
  const py = dx / len
  const half = widthM / 2
  return [
    [mid[0] - px * half, mid[1] - py * half],
    [mid[0] + px * half, mid[1] + py * half],
  ]
}

export function toHualienAlleyFeatures(alleys: HualienNarrowAlleyFeatureProps[]): Feature[] {
  return alleys.map(a => {
    const projected = a.geometry.coordinates.map((c: number[]) => fromLonLat([c[0], c[1]]))
    return new Feature({
      geometry: new LineString(perpendicularLine(projected, a.width_m_min)),
      id:              a.id,
      alley_name:      a.alley_name,
      township:        a.township,
      fire_station:    a.fire_station,
      width_m_min:     a.width_m_min,
      width_m_max:     a.width_m_max,
      risk_level:      a.risk_level,
      snap_distance_m: a.snap_distance_m,
      type: 'hualien_alley',
    })
  })
}

/** 僅保留後端判定非一般風險的道路作為窄巷虛線底圖 */
export function toRoadFeatures(roads: RoadFeatureProps[]): Feature[] {
  return roads
    .filter(r => r.risk_level !== '一般')
    .map(r => new Feature({
      geometry: new LineString(
        r.geometry.coordinates.map((c: number[]) => fromLonLat([c[0], c[1]]))
      ),
      road_width:     r.road_width,
      width_m:        r.width_m,
      width_category: r.width_category,
      risk_level:     r.risk_level,
      type: 'road',
    }))
}
