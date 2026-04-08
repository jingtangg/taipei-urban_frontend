/**
 * 窄巷圖層管理 Hook
 *
 * 職責:
 * - 管理消防局實測窄巷圖層的建立與顯示（實線）
 * - 依據實際寬度套用不同顏色 (紅色 < 3.5m, 黃色 3.5-6m)
 * - 支援按行政區和分類篩選資料
 */

import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { LineString } from 'ol/geom'
import { Style, Stroke } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { getNarrowAlleys } from '../services/urbanApi'

import { DETAIL_ZOOM_THRESHOLD } from './useDistrictLayer'
import { useZoomLevel } from './useZoomLevel'

/**
 * 窄巷圖層管理 Hook
 * @param map - OpenLayers Map 實例
 * @param visible - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示顯示全部
 */
export function useNarrowAlleyLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = 'all'
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)
  const [alleys, setAlleys] = useState<any[]>([])

  // 載入窄巷資料，district 改變時重新 fetch（全區總覽時不載入）
  useEffect(() => {
    if (selectedDistrict === 'all') {
      setAlleys([])
      return
    }
    getNarrowAlleys(selectedDistrict).then(setAlleys).catch(console.error)
  }, [selectedDistrict])

  // 建立並加入圖層
  useEffect(() => {
    if (!map || alleys.length === 0) return

    // 找到 roadsGroup 容器
    const roadsGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'roads_map'
    ) as LayerGroup

    if (!roadsGroup) {
      console.error('找不到 roads_map LayerGroup')
      return
    }

    // 建立 Features
    const features = alleys.map(alley => {
      const coords = alley.geometry.coordinates.map((c: number[]) => fromLonLat([c[0], c[1]]))
      const line = new LineString(coords)

      return new Feature({
        geometry: line,
        id: alley.id,
        alley_name: alley.alley_name,
        district: alley.district,
        category: alley.category,
        width_m: alley.width_m,
        road_width: alley.road_width,
        snap_distance_m: alley.snap_distance_m,
        type: 'narrow_alley',
      })
    })

    // ========== 第一階段：圖層創建 ==========
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => {
        const width = feature.get('width_m')
        const actualColor =
          width < 3.5
            ? 'rgba(252, 33, 33, 0.94)'
            : 'rgba(255, 170, 0, 0.92)'

        return [
          new Style({
            stroke: new Stroke({
              color: 'rgba(8, 12, 10, 0.62)',
              width: 4.2,
            }),
          }),
          new Style({
            stroke: new Stroke({
              color: actualColor,
              width: 3,
            }),
          }),
        ]
      },
      properties: { name: '消防局實測窄巷' },
      visible: false,
      zIndex: 10,
    })

    layerRef.current = layer
    roadsGroup.getLayers().push(layer)
    layer.setVisible(visible && currentZoom >= DETAIL_ZOOM_THRESHOLD) // 立即同步可見度，避免資料載入比 zoom 動畫慢時圖層不顯示

    return () => {
      roadsGroup.getLayers().remove(layer)
      layerRef.current = null
    }
  }, [map, alleys])

  // ========== 第二階段：動態控制 ==========
  // 控制顯示/隱藏：基於 zoom level
  // Zoom < 15: 隱藏（總覽層）, Zoom ≥ 15: 顯示（詳細層）
  useEffect(() => {
    if (layerRef.current) {
      const shouldShow = visible && currentZoom >= DETAIL_ZOOM_THRESHOLD
      layerRef.current.setVisible(shouldShow)
    }
  }, [visible, currentZoom])

  return layerRef
}
