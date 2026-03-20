/**
 * 消防設施圖層管理 Hook
 *
 * 職責:
 * - 管理消防栓與消防局兩個圖層的建立與顯示
 * - 提供消防設施的視覺化樣式
 * - 支援分別控制兩個子圖層的顯示/隱藏
 */

import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { Point } from 'ol/geom'
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { DETAIL_ZOOM_THRESHOLD } from './useDistrictLayer'
import { useZoomLevel } from './useZoomLevel'
import { getFireStations, getFireHydrants } from '../services/urbanApi'

interface UseFireLayersOptions {
  showHydrants: boolean   // 是否顯示消防栓
  showStations: boolean   // 是否顯示消防局
  district?: string       // 行政區篩選 (暫未使用)
}

/**
 * 消防設施圖層管理 Hook
 * @param map - OpenLayers Map 實例
 * @param options - 顯示選項
 */
export function useFireLayers(
  map: Map | null,
  options: UseFireLayersOptions
) {
  const hydrantLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const stationLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)
  const [stations, setStations] = useState<any[]>([])
  const [hydrants, setHydrants] = useState<any[]>([])

  // 載入消防隊與消防栓資料
  useEffect(() => {
    getFireStations().then(setStations).catch(console.error)
    getFireHydrants().then(setHydrants).catch(console.error)
  }, [])

  // 建立並加入圖層
  useEffect(() => {
    if (!map || stations.length === 0 || hydrants.length === 0) return

    // 找到 fireGroup 容器
    const fireGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'fire_map'
    ) as LayerGroup

    if (!fireGroup) {
      console.error('找不到 fire_map LayerGroup')
      return
    }

    // ========== 建立消防栓圖層 ==========
    const hydrantFeatures = hydrants.map(h => {
      const point = new Point(
        fromLonLat([h.geometry.coordinates[0], h.geometry.coordinates[1]])
      )
      return new Feature({
        geometry: point,
        district: h.district,
        hydrant_type: h.type,
        type: 'hydrant',
      })
    })

    const hydrantLayer = new VectorLayer({
      source: new VectorSource({ features: hydrantFeatures }),
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#00ff41' }),
          stroke: new Stroke({ color: '#00ff41', width: 2 }),
        }),
      }),
      properties: { name: '消防栓' },
      visible: false, // 初始隱藏，等 zoom 監聽啟動後再決定
    })

    // ========== 第一階段：圖層創建 ==========
    // ========== 建立消防局圖層 ==========
    const stationFeatures = stations.map(s => {
      const point = new Point(
        fromLonLat([s.geometry.coordinates[0], s.geometry.coordinates[1]])
      )
      return new Feature({
        geometry: point,
        name: s.name,
        address: s.address,
        type: 'station',
      })
    })

    const stationLayer = new VectorLayer({
      source: new VectorSource({ features: stationFeatures }),
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#ff4444' }),
          stroke: new Stroke({ color: '#ff4444', width: 2 }),
        }),
      }),
      properties: { name: '消防局' },
      visible: false, // 初始隱藏，等 zoom 監聽啟動後再決定
    })

    // 加入 fireGroup
    hydrantLayerRef.current = hydrantLayer
    stationLayerRef.current = stationLayer
    fireGroup.getLayers().push(hydrantLayer)
    fireGroup.getLayers().push(stationLayer)

    return () => {
      fireGroup.getLayers().remove(hydrantLayer)
      fireGroup.getLayers().remove(stationLayer)
      hydrantLayerRef.current = null
      stationLayerRef.current = null
    }
  }, [map, stations, hydrants])

  // ========== 第二階段：動態控制 ==========
  // 控制消防栓顯示/隱藏：基於 zoom level
  // Zoom < 15: 隱藏（總覽層）, Zoom ≥ 15: 顯示（詳細層）
  useEffect(() => {
    if (hydrantLayerRef.current) {
      const shouldShow = options.showHydrants && currentZoom >= DETAIL_ZOOM_THRESHOLD
      hydrantLayerRef.current.setVisible(shouldShow)
    }
  }, [options.showHydrants, currentZoom])

  // 控制消防局顯示/隱藏：基於 zoom level
  // Zoom < 15: 隱藏（總覽層）
  // Zoom ≥ 15: 顯示（詳細層）
  useEffect(() => {
    if (stationLayerRef.current) {
      const shouldShow = options.showStations && currentZoom >= DETAIL_ZOOM_THRESHOLD
      stationLayerRef.current.setVisible(shouldShow)
    }
  }, [options.showStations, currentZoom])

  return { hydrantLayerRef, stationLayerRef }
}
