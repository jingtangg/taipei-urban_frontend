/**
 * data/mockRoads.ts
 * 把 mockData.ts（舊格式 Road.planned_width）轉成 GeoFeature<RoadFeatureProps>
 * 對應全端 publicMixin.js 的 spire_data_list 假資料手法
 * 真實 API 上線後整支換成 getRoads() 即可
 */

import { ROADS, HYDRANTS, STATIONS } from '../mockData'
import type { RoadFeatureProps, FireHydrantFeatureProps, FireStationFeatureProps } from '../types/geo'

export interface RoadGeoFeature {
  type: 'Feature'
  geometry: { type: 'LineString'; coordinates: number[][] }
  properties: RoadFeatureProps
}

export interface HydrantGeoFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: FireHydrantFeatureProps
}

export interface StationGeoFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: FireStationFeatureProps
}

// planned_width (舊 Road 型別) → road_width (新 RoadFeatureProps)
export const MOCK_ROADS: RoadGeoFeature[] = ROADS.map((r, i) => ({
  type: 'Feature',
  geometry: r.geometry as { type: 'LineString'; coordinates: number[][] },
  properties: {
    id: i + 1,
    road_width: r.planned_width,
    road_name: r.name,
    district: r.district,
  },
}))

export const MOCK_HYDRANTS: HydrantGeoFeature[] = HYDRANTS.map((h, i) => ({
  type: 'Feature',
  geometry: h.geometry as { type: 'Point'; coordinates: [number, number] },
  properties: {
    id: i + 1,
    district: h.district,
  },
}))

export const MOCK_STATIONS: StationGeoFeature[] = STATIONS.map((s, i) => ({
  type: 'Feature',
  geometry: s.geometry as { type: 'Point'; coordinates: [number, number] },
  properties: {
    id: i + 1,
    name: s.name,
    district: s.district,
  },
}))