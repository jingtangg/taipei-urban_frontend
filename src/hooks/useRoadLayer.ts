/**
 * 道路圖層管理 Hook
 *
 * 職責:
 * - 管理都市計畫道路寬度圖層的建立與顯示
 * - 依據道路寬度分類套用不同顏色 (窄巷風險視覺化)
 *
 * 架構分層:
 * - 資料擷取：useApi（含 race condition 保護）
 * - 座標轉換：geoTransform.ts（JSON → OL Feature，含 width_m < 6 篩選）
 */

import { useEffect, useRef, useCallback } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { getRoads } from '../services/urbanApi'
import { DETAIL_ZOOM_THRESHOLD } from '../constants/mapConfig'
import { useZoomLevel } from './useZoomLevel'
import { useApi } from './useApi'
import { toRoadFeatures } from '../utils/geoTransform'
import { roadStyle } from '../styles/layerStyles'
import type { RoadFeatureProps } from '../types/geo'

/**
 * 道路圖層管理 Hook
 * @param map              - OpenLayers Map 實例
 * @param visible          - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示不載入
 */
export function useRoadLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = 'all'
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)

  // ========== 資料擷取 ==========
  const roadFn = useCallback(
    () => selectedDistrict === 'all'
      ? Promise.resolve([] as RoadFeatureProps[])
      : getRoads(selectedDistrict),
    [selectedDistrict],
  )
  const { data: roads } = useApi(roadFn, [] as RoadFeatureProps[])

  // ========== 第一階段：圖層創建 ==========
  useEffect(() => {
    if (!map || roads.length === 0) return

    const roadsGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'roads_map'
    ) as LayerGroup

    if (!roadsGroup) {
      console.error('找不到 roads_map LayerGroup')
      return
    }

    const layer = new VectorLayer({
      source: new VectorSource({ features: toRoadFeatures(roads) }),
      style: roadStyle,
      properties: { name: '都市計畫窄巷（虛線）' },
      visible: false,
      zIndex: 5,
    })

    layerRef.current = layer
    roadsGroup.getLayers().push(layer)
    // 立即同步可見度，避免資料載入比 zoom 動畫慢時圖層不顯示
    layer.setVisible(visible && currentZoom >= DETAIL_ZOOM_THRESHOLD)

    return () => {
      roadsGroup.getLayers().remove(layer)
      layerRef.current = null
    }
  }, [map, roads])

  // ========== 第二階段：動態控制 ==========
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible && currentZoom >= DETAIL_ZOOM_THRESHOLD)
    }
  }, [visible, currentZoom])

  return layerRef
}
