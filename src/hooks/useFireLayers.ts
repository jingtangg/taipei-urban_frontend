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
import { Style, Circle as CircleStyle, Fill, Stroke, RegularShape } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { DETAIL_ZOOM_THRESHOLD } from './useDistrictLayer'
import { useZoomLevel } from './useZoomLevel'
import { getFireStations, getFireHydrants } from '../services/urbanApi'

interface UseFireLayersOptions {
  showHydrants: boolean   // 是否顯示消防栓
  showStations: boolean   // 是否顯示消防局
  district?: string       // 行政區篩選，'all' 或 undefined 表示全部
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

  // 載入消防隊與消防栓資料，district 改變時重新 fetch
  useEffect(() => {
    const district = options.district === 'all' ? undefined : options.district
    getFireStations(district).then(setStations).catch(console.error)
    getFireHydrants(district).then(setHydrants).catch(console.error)
  }, [options.district])

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
      style: (feature) => {
        const hydrantType = feature.get('hydrant_type')
        const accentColor =
          hydrantType === 'aboveground'
            ? 'rgba(74, 255, 220, 0.95)'
            : 'rgba(94, 231, 255, 0.95)'

        return [
          new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: 'rgba(74, 255, 220, 0.08)' }),
              stroke: new Stroke({ color: 'rgba(74, 255, 220, 0.22)', width: 1 }),
            }),
          }),
          new Style({
            image: new CircleStyle({
              radius: 4.5,
              fill: new Fill({ color: 'rgba(6, 12, 11, 0.88)' }),
              stroke: new Stroke({ color: accentColor, width: 1.2 }),
            }),
          }),
          new Style({
            image: new RegularShape({
              points: 4,
              radius: hydrantType === 'aboveground' ? 2.2 : 2.8,
              radius2: hydrantType === 'aboveground' ? 0.8 : undefined,
              angle: Math.PI / 4,
              fill: new Fill({
                color:
                  hydrantType === 'aboveground'
                    ? accentColor
                    : 'rgba(6, 12, 11, 0.92)',
              }),
              stroke:
                hydrantType === 'aboveground'
                  ? undefined
                  : new Stroke({ color: accentColor, width: 1 }),
            }),
          }),
        ]
      },
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
      style: [
        new Style({
          image: new CircleStyle({
            radius: 12,
            fill: new Fill({ color: 'rgba(255, 116, 160, 0.10)' }),
            stroke: new Stroke({ color: 'rgba(255, 116, 160, 0.20)', width: 1.2 }),
          }),
        }),
        new Style({
          image: new RegularShape({
            points: 4,
            radius: 8.5,
            angle: Math.PI / 4,
            fill: new Fill({ color: 'rgba(8, 9, 11, 0.92)' }),
            stroke: new Stroke({ color: 'rgba(255, 116, 160, 0.95)', width: 1.4 }),
          }),
        }),
        new Style({
          image: new CircleStyle({
            radius: 3.2,
            fill: new Fill({ color: 'rgba(255, 231, 238, 0.96)' }),
            stroke: new Stroke({ color: 'rgba(255, 116, 160, 0.9)', width: 1 }),
          }),
        }),
      ],
      properties: { name: '消防局' },
      visible: false, // 初始隱藏，等 zoom 監聽啟動後再決定
    })

    // 加入 fireGroup
    hydrantLayerRef.current = hydrantLayer
    stationLayerRef.current = stationLayer
    fireGroup.getLayers().push(hydrantLayer)
    fireGroup.getLayers().push(stationLayer)
    hydrantLayer.setVisible(options.showHydrants && currentZoom >= DETAIL_ZOOM_THRESHOLD) // 立即同步可見度，避免資料載入比 zoom 動畫慢時圖層不顯示
    stationLayer.setVisible(options.showStations && currentZoom >= DETAIL_ZOOM_THRESHOLD)

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
