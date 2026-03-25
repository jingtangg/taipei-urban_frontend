/**
 * 道路圖層管理 Hook
 *
 * 職責:
 * - 管理道路寬度圖層的建立與顯示
 * - 依據道路寬度分類套用不同顏色 (窄巷風險視覺化)
 * - 支援按行政區篩選道路資料
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
import { getRoads } from '../services/urbanApi'
import { getRiskInfo } from '../types/geo'
import { DETAIL_ZOOM_THRESHOLD } from './useDistrictLayer'
import { useZoomLevel } from './useZoomLevel'

/**
 * 道路圖層管理 Hook
 * @param map - OpenLayers Map 實例
 * @param visible - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示顯示全部
 */
export function useRoadLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = 'all'
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)
  const [roads, setRoads] = useState<any[]>([])

  // 載入道路資料，district 改變時重新 fetch
  useEffect(() => {
    const district = selectedDistrict === 'all' ? undefined : selectedDistrict
    getRoads(district).then(setRoads).catch(console.error)
  }, [selectedDistrict])

  // 建立並加入圖層
  useEffect(() => {
    if (!map || roads.length === 0) return

    // 找到 roadsGroup 容器
    const roadsGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'roads_map'
    ) as LayerGroup

    if (!roadsGroup) {
      console.error('找不到 roads_map LayerGroup')
      return
    }

    // 建立 Features（只保留 width_m < 6 的道路作為窄巷虛線底圖）
    const features = roads
      .filter(r => r.width_m < 6)
      .map(r => {
        const coords = r.geometry.coordinates.map((c: number[]) => fromLonLat([c[0], c[1]]))
        const line = new LineString(coords)
        return new Feature({
          geometry: line,
          road_width: r.road_width,
          width_m: r.width_m,
          width_category: r.width_category,
          type: 'road',
        })
      })

    // ========== 第一階段：圖層創建 ==========
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => {
        const width = feature.get('width_m')
        const riskInfo = getRiskInfo(width, 'planned')

        return new Style({
          stroke: new Stroke({
            color: riskInfo.color,
            width: 3,
            lineDash: [10, 5],
          }),
        })
      },
      properties: { name: '都市計畫窄巷（虛線）' },
      visible: false,
      zIndex: 5,
    })

    layerRef.current = layer
    roadsGroup.getLayers().push(layer)

    return () => {
      roadsGroup.getLayers().remove(layer)
      layerRef.current = null
    }
  }, [map, roads])

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
