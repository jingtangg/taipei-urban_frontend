/**
 * 消防設施圖層管理 Hook
 *
 * 職責:
 * - 管理消防栓與消防局兩個圖層的建立與顯示
 * - 支援分別控制兩個子圖層的顯示/隱藏
 *
 * 架構分層:
 * - 資料擷取：useApi（含 race condition 保護）
 * - 座標轉換：geoTransform.ts（JSON → OL Feature）
 * - 視覺樣式：fireStyles.ts（Style 物件定義）
 */

import { useEffect, useRef, useCallback } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { DETAIL_ZOOM_THRESHOLD } from './useDistrictLayer'
import { useZoomLevel } from './useZoomLevel'
import { useApi } from './useApi'
import { getFireStations, getFireHydrants } from '../services/urbanApi'
import { toHydrantFeatures, toStationFeatures } from '../utils/geoTransform'
import { hydrantStyle, stationStyle } from '../styles/fireStyles'
import type { FireHydrantFeatureProps, FireStationFeatureProps } from '../types/geo'

/**
 * 消防設施圖層管理 Hook
 * @param map             - OpenLayers Map 實例
 * @param showHydrants    - 是否顯示消防栓
 * @param showStations    - 是否顯示消防局
 * @param selectedDistrict - 選中的行政區名稱，'all' 表示不載入（僅顯示總覽）
 */
export function useFireLayers(
  map: Map | null,
  showHydrants: boolean,
  showStations: boolean,
  selectedDistrict: string = 'all'
) {
  const hydrantLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const stationLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)

  // ========== 資料擷取 ==========
  const stationFn = useCallback(
    () => selectedDistrict === 'all'
      ? Promise.resolve([] as FireStationFeatureProps[])
      : getFireStations(selectedDistrict),
    [selectedDistrict],
  )
  const hydrantFn = useCallback(
    () => selectedDistrict === 'all'
      ? Promise.resolve([] as FireHydrantFeatureProps[])
      : getFireHydrants(selectedDistrict),
    [selectedDistrict],
  )

  const { data: stations } = useApi(stationFn, [] as FireStationFeatureProps[])
  const { data: hydrants } = useApi(hydrantFn, [] as FireHydrantFeatureProps[])

  // ========== 第一階段：圖層創建 ==========
  useEffect(() => {
    if (!map || stations.length === 0 || hydrants.length === 0) return

    const fireGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'fire_map'
    ) as LayerGroup

    if (!fireGroup) {
      console.error('找不到 fire_map LayerGroup')
      return
    }

    const hydrantLayer = new VectorLayer({
      source: new VectorSource({ features: toHydrantFeatures(hydrants) }),
      style:  hydrantStyle,
      properties: { name: '消防栓' },
      visible: false,
    })

    const stationLayer = new VectorLayer({
      source: new VectorSource({ features: toStationFeatures(stations) }),
      style:  stationStyle,
      properties: { name: '消防局' },
      visible: false,
    })

    hydrantLayerRef.current = hydrantLayer
    stationLayerRef.current = stationLayer
    fireGroup.getLayers().push(hydrantLayer)
    fireGroup.getLayers().push(stationLayer)
    // 立即同步可見度，避免資料載入比 zoom 動畫慢時圖層不顯示
    hydrantLayer.setVisible(showHydrants && currentZoom >= DETAIL_ZOOM_THRESHOLD)
    stationLayer.setVisible(showStations && currentZoom >= DETAIL_ZOOM_THRESHOLD)

    return () => {
      fireGroup.getLayers().remove(hydrantLayer)
      fireGroup.getLayers().remove(stationLayer)
      hydrantLayerRef.current = null
      stationLayerRef.current = null
    }
  }, [map, stations, hydrants])

  // ========== 第二階段：動態控制 ==========
  useEffect(() => {
    if (hydrantLayerRef.current) {
      hydrantLayerRef.current.setVisible(showHydrants && currentZoom >= DETAIL_ZOOM_THRESHOLD)
    }
  }, [showHydrants, currentZoom])

  useEffect(() => {
    if (stationLayerRef.current) {
      stationLayerRef.current.setVisible(showStations && currentZoom >= DETAIL_ZOOM_THRESHOLD)
    }
  }, [showStations, currentZoom])

  return { hydrantLayerRef, stationLayerRef }
}
